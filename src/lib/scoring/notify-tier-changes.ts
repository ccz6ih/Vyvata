// Practitioner notifications when a product a patient is on gets downgraded.
// Called after rescoreProducts() from the weekly cron. Given the tierChanges
// array from the rescore result, we:
//
//   1. Filter to downgrades that actually matter (drop into standard/rejected,
//      or any step down from elite/verified).
//   2. For each downgraded product, scan the raw_input of every active patient
//      session for a brand/name substring match (same probe approach the
//      /api/practitioner/compliance-alerts route uses).
//   3. Group hits by practitioner and send one summary email per practitioner.
//
// Skipped entirely when RESEND_API_KEY is not set — the rescore job still
// completes; we just can't email. The cron handler surfaces this in its JSON
// response for observability.

import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { RescoreResult } from "@/lib/scoring/rescore-job";

type TierChange = RescoreResult["tierChanges"][number];

const TIER_RANK: Record<string, number> = {
  elite: 4,
  verified: 3,
  standard: 2,
  rejected: 1,
};

function isDowngrade(change: TierChange): boolean {
  const prev = change.previousTier ? TIER_RANK[change.previousTier] ?? 0 : 0;
  const next = TIER_RANK[change.newTier] ?? 0;
  return prev > next;
}

export interface TierChangeNotifyResult {
  emailsSent: number;
  practitionersNotified: number;
  patientMatches: number;
  downgrades: number;
  skipped: boolean;
  errors: string[];
}

interface PatientMatch {
  practitionerId: string;
  practitionerName: string;
  practitionerEmail: string;
  patientLabel: string;
  auditSlug: string | null;
  productBrand: string;
  productName: string;
  previousTier: string | null;
  newTier: string;
  previousScore: number | null;
  newScore: number;
  matchedProbe: string;
}

export async function notifyPractitionersOfTierChanges(
  supabase: SupabaseClient,
  tierChanges: TierChange[],
  opts?: { appUrl?: string }
): Promise<TierChangeNotifyResult> {
  const result: TierChangeNotifyResult = {
    emailsSent: 0,
    practitionersNotified: 0,
    patientMatches: 0,
    downgrades: 0,
    skipped: false,
    errors: [],
  };

  const downgrades = tierChanges.filter(isDowngrade);
  result.downgrades = downgrades.length;
  if (downgrades.length === 0) return result;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    result.skipped = true;
    return result;
  }

  const { data: linksRaw, error: linksErr } = await supabase
    .from("patient_links")
    .select(`
      id, patient_label, session_id,
      practitioner:practitioners!practitioner_id (id, name, email),
      sessions (raw_input),
      audits (public_slug)
    `)
    .neq("status", "archived");

  if (linksErr) {
    result.errors.push(`patient_links fetch: ${linksErr.message}`);
    return result;
  }

  type LinkRow = {
    id: string;
    patient_label: string | null;
    session_id: string;
    practitioner: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null;
    sessions: { raw_input: string | null } | { raw_input: string | null }[] | null;
    audits: { public_slug: string } | { public_slug: string }[] | null;
  };
  const links = (linksRaw ?? []) as unknown as LinkRow[];
  if (links.length === 0) return result;

  const firstOrSelf = <T,>(v: T | T[] | null): T | null =>
    !v ? null : Array.isArray(v) ? v[0] ?? null : v;

  const matches: PatientMatch[] = [];
  for (const change of downgrades) {
    const probes = [change.brand, change.name, `${change.brand} ${change.name}`].filter(Boolean);
    for (const link of links) {
      const prac = firstOrSelf(link.practitioner);
      if (!prac?.email) continue;
      const sess = firstOrSelf(link.sessions);
      const text = (sess?.raw_input ?? "").toLowerCase();
      if (!text) continue;
      const hit = probes.find((p) => text.includes(p.toLowerCase()));
      if (!hit) continue;

      const audit = firstOrSelf(link.audits);
      matches.push({
        practitionerId: prac.id,
        practitionerName: prac.name,
        practitionerEmail: prac.email,
        patientLabel: link.patient_label ?? `Patient ${link.id.slice(0, 6).toUpperCase()}`,
        auditSlug: audit?.public_slug ?? null,
        productBrand: change.brand,
        productName: change.name,
        previousTier: change.previousTier,
        newTier: change.newTier,
        previousScore: change.previousScore,
        newScore: change.newScore,
        matchedProbe: hit,
      });
    }
  }

  result.patientMatches = matches.length;
  if (matches.length === 0) return result;

  const byPractitioner = new Map<string, PatientMatch[]>();
  for (const m of matches) {
    const arr = byPractitioner.get(m.practitionerId) ?? [];
    arr.push(m);
    byPractitioner.set(m.practitionerId, arr);
  }
  result.practitionersNotified = byPractitioner.size;

  const resend = new Resend(resendKey);
  const appUrl = opts?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://vyvata.com";

  for (const [, patientMatches] of byPractitioner) {
    const first = patientMatches[0];
    try {
      await resend.emails.send({
        from: "Vyvata <hello@vyvata.com>",
        to: first.practitionerEmail,
        subject: `${patientMatches.length} patient${patientMatches.length === 1 ? "" : "s"} on a downgraded product`,
        html: tierChangeEmailHtml(first.practitionerName, patientMatches, appUrl),
      });
      result.emailsSent += 1;
    } catch (err) {
      result.errors.push(
        `email ${first.practitionerEmail}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

function tierChangeEmailHtml(
  practitionerName: string,
  matches: PatientMatch[],
  appUrl: string
): string {
  const firstName = practitionerName.split(" ")[0];
  const rows = matches
    .map((m) => {
      const delta = m.previousScore != null ? `${m.previousScore} → ${m.newScore}` : `→ ${m.newScore}`;
      const tierDelta = m.previousTier ? `${m.previousTier.toUpperCase()} → ${m.newTier.toUpperCase()}` : m.newTier.toUpperCase();
      const patientHref = m.auditSlug ? `${appUrl}/audit/${m.auditSlug}` : `${appUrl}/practitioner/dashboard`;
      return `
        <tr><td style="padding:14px 0;border-bottom:1px solid rgba(201,214,223,0.08);">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#E8F0F5;">${escapeHtml(m.patientLabel)}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#C9D6DF;">${escapeHtml(m.productBrand)} · ${escapeHtml(m.productName)}</p>
          <p style="margin:0 0 8px;font-size:12px;color:#7A90A8;">Score ${delta} · <span style="color:#F87171;font-weight:700;letter-spacing:1px;">${tierDelta}</span></p>
          <a href="${patientHref}" style="font-size:12px;color:#14B8A6;text-decoration:none;font-weight:600;">Review patient →</a>
        </td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Product tier change — Vyvata</title></head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">VYVATA</span>
        </td></tr>
        <tr><td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#F87171;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">Product tier change</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;">Heads up, ${escapeHtml(firstName)}</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#7A90A8;line-height:1.6;">
            Our weekly rescore moved ${matches.length} product${matches.length === 1 ? "" : "s"}
            on ${matches.length === 1 ? "one of your patient's stacks" : "your patients' stacks"} to a lower tier.
            Review and consider whether a protocol adjustment is warranted.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          <p style="margin:24px 0 0;font-size:12px;color:#4a6080;line-height:1.6;">
            Tier changes come from new FDA enforcement actions, CAERS adverse event signals,
            and updated manufacturer/certification data. The scorecards themselves are public,
            so you can link patients directly.
          </p>
          <a href="${appUrl}/practitioner/dashboard" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#14B8A6,#0F766E);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;padding:14px 28px;border-radius:10px;text-decoration:none;">Open dashboard →</a>
        </td></tr>
        <tr><td style="padding-top:28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4a6080;">© Vyvata · AI-powered supplement intelligence<br/>Questions? <a href="mailto:hello@vyvata.com" style="color:#14B8A6;text-decoration:none;">hello@vyvata.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
