// POST /api/unlock-report
// Accepts email + auditId, generates full report, sends branded email via Resend.
// Email includes a magic-link "Save to my account" button so the user can sign
// in and see every past audit on /me with one tap.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";
import { parseStackText } from "@/lib/stack-parser";
import { runRulesEngine } from "@/lib/rules-engine";
import type { Goal, ReportSection } from "@/types";
import { synthesizeReport } from "@/lib/llm-synthesizer";

const BodySchema = z.object({
  auditId: z.string(),
  email: z.string().email(),
  sessionId: z.string(),
});

function getAppOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && env !== "undefined") return env.replace(/\/$/, "");
  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { auditId, email, sessionId } = parsed.data;
    const origin = getAppOrigin(req);
    const supabase = getSupabaseServer();

    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .select("*, sessions(*)")
      .eq("id", auditId)
      .single();

    if (auditError || !audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    if (audit.is_unlocked && audit.report_json) {
      return NextResponse.json({
        success: true,
        report: JSON.parse(audit.report_json),
        publicSlug: audit.public_slug,
        score: audit.score,
      });
    }

    const session = audit.sessions;
    const rawInput = session.raw_input;
    const goals = JSON.parse(session.goals) as Goal[];
    const ingredients = parseStackText(rawInput);
    const rules = runRulesEngine(ingredients, goals);

    const report = await synthesizeReport(rules, goals);

    await supabase.from("users").upsert(
      { email, created_via: "email_gate" },
      { onConflict: "email" }
    );

    const user = await getCurrentUser();

    const { error: updateError } = await supabase
      .from("audits")
      .update({
        email,
        is_unlocked: true,
        report_json: JSON.stringify(report),
        ...(user ? { user_id: user.id } : {}),
      })
      .eq("id", auditId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    void supabase.from("referrals").insert({
      audit_id: auditId,
      public_slug: audit.public_slug,
      email,
    });
    void sessionId; // reserved for future session-level tracking

    const signInLink = await generateSignInLink(origin, email, audit.public_slug);
    await sendReportEmail(origin, email, audit.public_slug, audit.score, report, signInLink);

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

/**
 * Ask Supabase to generate a magic-link URL without sending the default email.
 * Returned action_link is a single-use URL that signs the user in and redirects
 * to our /auth/callback, which forwards to the protocol page.
 * Requires SUPABASE_SERVICE_ROLE_KEY; returns null if not configured.
 */
async function generateSignInLink(
  origin: string,
  email: string,
  publicSlug: string
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const next = `/protocol/${publicSlug}`;

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error || !data?.properties?.action_link) {
      console.error("[unlock-report] generateLink error:", error);
      return null;
    }
    return data.properties.action_link;
  } catch (err) {
    console.error("[unlock-report] generateLink threw:", err);
    return null;
  }
}

async function sendReportEmail(
  origin: string,
  email: string,
  publicSlug: string,
  score: number,
  report: ReportSection,
  signInLink: string | null
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const reportUrl = `${origin}/protocol/${publicSlug}`;

    await resend.emails.send({
      from: "Vyvata <hello@vyvata.com>",
      to: email,
      subject: "Your Vyvata protocol is ready.",
      html: buildEmailHtml(score, report, reportUrl, signInLink),
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
}

function buildEmailHtml(
  score: number,
  report: ReportSection,
  url: string,
  signInLink: string | null
): string {
  const scoreColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e5e5e5;">
  <div style="border: 1px solid #333; border-radius: 8px; padding: 32px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #14B8A6; margin: 0 0 8px;">Vyvata</h1>
    <p style="color: #888; font-size: 14px; margin: 0 0 32px;">Your AI health protocol</p>

    <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 48px; font-weight: 800; color: ${scoreColor};">${score}</div>
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

    ${signInLink ? `
    <div style="margin-top: 28px; padding: 20px; background: rgba(20,184,166,0.06); border: 1px solid rgba(20,184,166,0.2); border-radius: 8px;">
      <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #E5F9F4; text-align: center;">Save this to your Vyvata account</p>
      <p style="margin: 0 0 14px; font-size: 12px; color: #9db6c7; text-align: center; line-height: 1.5;">One tap signs you in. See every protocol you've run, re-audit any time.</p>
      <p style="text-align: center; margin: 0;"><a href="${signInLink}" style="display: inline-block; background: rgba(20,184,166,0.12); border: 1px solid #14B8A6; color: #14B8A6; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 13px; text-decoration: none;">Save to my account →</a></p>
    </div>` : ''}

    <p style="font-size: 12px; color: #555; text-align: center; margin-top: 24px;">Precision protocols for human optimization. Unsubscribe anytime.</p>
  </div>
</body>
</html>`;
}
