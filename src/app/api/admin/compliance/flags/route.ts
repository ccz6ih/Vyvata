// GET /api/admin/compliance/flags
// Lists compliance flags with filters. Admin-cookie gated.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const source = url.searchParams.get("source");
  const confidence = url.searchParams.get("confidence");
  const includeResolved = url.searchParams.get("includeResolved") === "1";

  const supabase = getSupabaseServer();
  let query = supabase
    .from("compliance_flags")
    .select(`
      id, source, source_id, subject, severity, violation_types, issued_date,
      matched_manufacturer_id, matched_product_id, match_confidence, match_notes,
      resolved_at, resolved_by, resolved_reason, created_at,
      manufacturer:manufacturers!matched_manufacturer_id (id, name),
      product:products!matched_product_id (id, slug, brand, name)
    `)
    .order("issued_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (source) query = query.eq("source", source);
  if (confidence) query = query.eq("match_confidence", confidence);
  if (!includeResolved) query = query.is("resolved_at", null);

  const { data, error } = await query.limit(500);
  if (error) {
    console.error("compliance flags list error:", error);
    return NextResponse.json({ error: "Failed to load flags" }, { status: 500 });
  }

  // Tally for the header
  const { data: countsRaw } = await supabase
    .from("compliance_flags")
    .select("match_confidence, source")
    .is("resolved_at", null);

  const counts = {
    total: countsRaw?.length ?? 0,
    unmatched: 0,
    low: 0,
    medium: 0,
    high: 0,
    bySource: {} as Record<string, number>,
  };
  for (const r of (countsRaw ?? []) as Array<{ match_confidence: string; source: string }>) {
    if (r.match_confidence === "unmatched") counts.unmatched += 1;
    if (r.match_confidence === "low") counts.low += 1;
    if (r.match_confidence === "medium") counts.medium += 1;
    if (r.match_confidence === "high") counts.high += 1;
    counts.bySource[r.source] = (counts.bySource[r.source] ?? 0) + 1;
  }

  return NextResponse.json({ flags: data ?? [], counts });
}
