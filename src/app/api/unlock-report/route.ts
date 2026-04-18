// POST /api/unlock-report
// Accepts email + auditId, generates full report, sends email via Resend

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { parseStackText } from "@/lib/stack-parser";
import { runRulesEngine } from "@/lib/rules-engine";
import type { Goal, ReportSection } from "@/types";
import { synthesizeReport } from "@/lib/llm-synthesizer";

const BodySchema = z.object({
  auditId: z.string(),
  email: z.string().email(),
  sessionId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { auditId, email, sessionId } = parsed.data;
    const supabase = getSupabaseServer();

    // Fetch audit
    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .select("*, sessions(*)")
      .eq("id", auditId)
      .single();

    if (auditError || !audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // If already unlocked, just return the report
    if (audit.is_unlocked && audit.report_json) {
      return NextResponse.json({
        success: true,
        report: JSON.parse(audit.report_json),
        publicSlug: audit.public_slug,
        score: audit.score,
      });
    }

    // Generate full report from rules engine
    const session = audit.sessions;
    const rawInput = session.raw_input;
    const goals = JSON.parse(session.goals) as Goal[];
    const ingredients = parseStackText(rawInput);
    const rules = runRulesEngine(ingredients, goals);

    const report = await synthesizeReport(rules, goals);

    // Upsert user
    await supabase.from("users").upsert({
      email,
      created_via: "email_gate",
    }, { onConflict: "email" });

    // Update audit with email, unlock, report
    const { error: updateError } = await supabase
      .from("audits")
      .update({
        email,
        is_unlocked: true,
        report_json: JSON.stringify(report),
      })
      .eq("id", auditId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    // Track referral if public slug exists
    // non-blocking referral tracking
    void supabase.from("referrals").insert({
      audit_id: auditId,
      public_slug: audit.public_slug,
      email,
    });

    // Send email via Resend (if configured)
    await sendReportEmail(email, audit.public_slug, audit.score, report);

    return NextResponse.json({
      success: true,
      report,
      publicSlug: audit.public_slug,
      score: audit.score,
    });
  } catch (err) {
    console.error("unlock-report error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function sendReportEmail(
  email: string,
  publicSlug: string,
  score: number,
  report: ReportSection
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return; // Skip if not configured

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/protocol/${publicSlug}`;

    await resend.emails.send({
      from: "Vyvata <hello@vyvata.com>",
      to: email,
      subject: "Your Vyvata protocol is ready.",
      html: buildEmailHtml(score, report, reportUrl),
    });
  } catch (err) {
    console.error("Email send error:", err);
    // Non-fatal
  }
}

function buildEmailHtml(score: number, report: ReportSection, url: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e5e5e5;">
  <div style="border: 1px solid #333; border-radius: 8px; padding: 32px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #14B8A6; margin: 0 0 8px;">Vyvata</h1>
    <p style="color: #888; font-size: 14px; margin: 0 0 32px;">Your AI health protocol</p>

    <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 48px; font-weight: 800; color: ${score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'};">${score}</div>
      <div style="font-size: 14px; color: #888;">Stack Score / 100</div>
    </div>

    <h2 style="font-size: 16px; font-weight: 600; color: #fff; margin: 0 0 12px;">The Verdict</h2>
    <p style="font-size: 14px; color: #ccc; line-height: 1.6; margin: 0 0 24px;">${report.verdict}</p>

    ${report.working.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #22c55e; margin: 0 0 12px;">What's Working</h2>
    <ul style="padding: 0; margin: 0 0 24px; list-style: none;">
      ${report.working.map(w => `<li style="font-size: 14px; color: #ccc; padding: 8px 0; border-bottom: 1px solid #222;"><strong style="color: #fff;">${w.name}</strong> — ${w.reason}</li>`).join('')}
    </ul>` : ''}

    <div style="text-align: center; margin-top: 32px;">
      <a href="${url}" style="display: inline-block; background: #14B8A6; color: #0B1F3B; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none;">View Your Protocol →</a>
    </div>

    <p style="font-size: 12px; color: #555; text-align: center; margin-top: 24px;">Precision protocols for human optimization. Unsubscribe anytime.</p>
  </div>
</body>
</html>`;
}
