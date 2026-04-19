// GET /api/practitioner/compliance-alerts
// Returns the practitioner's patient_links whose audits reference ingredients
// matching a flagged product or manufacturer. Implementation: for each active
// patient_link, fetch the session's parsed ingredients and check if any
// flagged product's brand substring appears in the raw_input.
//
// Lightweight: we only fetch text-level signals, no cross-table joins that
// PostgREST can't infer. Returns compact alert rows for a dashboard badge
// and a "review" surface.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getPractitionerSession } from "@/lib/practitioner-auth";

export async function GET() {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServer();

  // 1. Active flags with a matched product/manufacturer (ignore unmatched — no
  //    way to tie those to a specific patient).
  const { data: flagsRaw } = await supabase
    .from("compliance_flags")
    .select(`
      id, source, subject, severity, issued_date,
      matched_manufacturer_id, matched_product_id,
      manufacturer:manufacturers!matched_manufacturer_id (id, name),
      product:products!matched_product_id (id, brand, name)
    `)
    .is("resolved_at", null)
    .not("match_confidence", "eq", "unmatched");

  type FlagRow = {
    id: string;
    source: string;
    subject: string;
    severity: string;
    issued_date: string | null;
    matched_manufacturer_id: string | null;
    matched_product_id: string | null;
    manufacturer: { id: string; name: string } | { id: string; name: string }[] | null;
    product: { id: string; brand: string; name: string } | { id: string; brand: string; name: string }[] | null;
  };
  const flags = (flagsRaw ?? []) as unknown as FlagRow[];
  if (flags.length === 0) {
    return NextResponse.json({ alerts: [], flaggedPatientCount: 0, totalFlags: 0 });
  }

  // 2. The practitioner's active patient links with their session's raw_input.
  const { data: linksRaw } = await supabase
    .from("patient_links")
    .select(`
      id, patient_label, session_id,
      sessions (raw_input),
      audits (id, public_slug)
    `)
    .eq("practitioner_id", session.id)
    .neq("status", "archived");

  type LinkRow = {
    id: string;
    patient_label: string | null;
    session_id: string;
    sessions: { raw_input: string | null } | { raw_input: string | null }[] | null;
    audits: { id: string; public_slug: string } | { id: string; public_slug: string }[] | null;
  };
  const links = (linksRaw ?? []) as unknown as LinkRow[];
  if (links.length === 0) {
    return NextResponse.json({ alerts: [], flaggedPatientCount: 0, totalFlags: 0 });
  }

  // 3. For each flag, build a brand-name probe set and search patient raw_inputs.
  const alerts: Array<{
    patientLinkId: string;
    patientLabel: string;
    auditSlug: string | null;
    flagId: string;
    flagSource: string;
    flagSeverity: string;
    flagSubject: string;
    flagIssuedDate: string | null;
    matchedBrand: string;
  }> = [];

  const firstOrSelf = <T,>(v: T | T[] | null): T | null =>
    !v ? null : Array.isArray(v) ? v[0] ?? null : v;

  for (const flag of flags) {
    const mfr = firstOrSelf(flag.manufacturer);
    const prod = firstOrSelf(flag.product);
    const probes: string[] = [];
    if (mfr?.name) probes.push(mfr.name);
    if (prod?.brand) probes.push(prod.brand);
    if (prod?.name) probes.push(prod.name);

    for (const link of links) {
      const sess = firstOrSelf(link.sessions);
      const text = (sess?.raw_input ?? "").toLowerCase();
      if (!text) continue;
      const hit = probes.find((p) => text.includes(p.toLowerCase()));
      if (!hit) continue;

      const audit = firstOrSelf(link.audits);
      alerts.push({
        patientLinkId: link.id,
        patientLabel: link.patient_label ?? `Patient ${link.id.slice(0, 6).toUpperCase()}`,
        auditSlug: audit?.public_slug ?? null,
        flagId: flag.id,
        flagSource: flag.source,
        flagSeverity: flag.severity,
        flagSubject: flag.subject,
        flagIssuedDate: flag.issued_date,
        matchedBrand: hit,
      });
    }
  }

  const uniquePatientIds = new Set(alerts.map((a) => a.patientLinkId));

  return NextResponse.json({
    alerts,
    flaggedPatientCount: uniquePatientIds.size,
    totalFlags: alerts.length,
  });
}
