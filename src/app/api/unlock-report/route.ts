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
import { calculateStackScores } from "@/lib/scoring-engine";
import { getEvidenceForIngredients } from "@/lib/evidence-helpers";
import type { Goal, ReportSection } from "@/types";
import type { StackScore } from "@/lib/scoring-engine";
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

    // Calculate stack scores
    const ingredientNames = ingredients.map(ing => ing.name);
    const userGoals = { primary: [goals[0]], secondary: goals.slice(1) };
    const stackScores = calculateStackScores(ingredientNames, userGoals);

    // Get evidence summaries
    const allIngredients = [
      ...report.working.map(i => i.name),
      ...report.missing.map(i => i.name),
      ...report.revisedStack.filter(i => i.status !== "remove").map(i => i.name),
    ];
    const evidence = getEvidenceForIngredients(allIngredients);

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
    await sendReportEmail(origin, email, audit.public_slug, audit.score, report, signInLink, stackScores, evidence);

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
  signInLink: string | null,
  stackScores: StackScore,
  evidence: ReturnType<typeof getEvidenceForIngredients>
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
      html: buildEmailHtml(score, report, reportUrl, signInLink, stackScores, evidence),
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
}

function buildEmailHtml(
  score: number,
  report: ReportSection,
  url: string,
  signInLink: string | null,
  stackScores: StackScore,
  evidence: ReturnType<typeof getEvidenceForIngredients>
): string {
  const scoreColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  
  const getScoreColor = (s: number) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
  const getGrade = (s: number) => s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : s >= 50 ? "D" : "F";
  
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e5e5e5;">
  <div style="border: 1px solid #333; border-radius: 8px; padding: 32px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #14B8A6; margin: 0 0 8px;">Vyvata</h1>
    <p style="color: #888; font-size: 14px; margin: 0 0 32px;">Your AI health protocol</p>

    <!-- Protocol Score -->
    <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 48px; font-weight: 800; color: ${scoreColor};">${score}</div>
      <div style="font-size: 14px; color: #888;">Protocol Score / 100</div>
    </div>

    <!-- Stack Analysis Scores -->
    <div style="background: rgba(20,184,166,0.05); border: 1px solid rgba(20,184,166,0.2); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #14B8A6; margin: 0 0 16px; text-align: center;">Your Stack Analysis</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Evidence</div>
          <div style="font-size: 28px; font-weight: 700; color: ${getScoreColor(stackScores.evidenceScore)}; margin-bottom: 2px;">${stackScores.evidenceScore}</div>
          <div style="font-size: 12px; color: #14B8A6; font-weight: 600;">${getGrade(stackScores.evidenceScore)}</div>
        </div>
        
        <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Safety</div>
          <div style="font-size: 28px; font-weight: 700; color: ${getScoreColor(stackScores.safetyScore)}; margin-bottom: 2px;">${stackScores.safetyScore}</div>
          <div style="font-size: 12px; color: #14B8A6; font-weight: 600;">${getGrade(stackScores.safetyScore)}</div>
        </div>
        
        <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Optimization</div>
          <div style="font-size: 28px; font-weight: 700; color: ${getScoreColor(stackScores.optimizationScore)}; margin-bottom: 2px;">${stackScores.optimizationScore}</div>
          <div style="font-size: 12px; color: #14B8A6; font-weight: 600;">${getGrade(stackScores.optimizationScore)}</div>
        </div>
        
        <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Value</div>
          <div style="font-size: 28px; font-weight: 700; color: #666; margin-bottom: 2px;">${stackScores.valueScore}</div>
          <div style="font-size: 12px; color: #666; font-weight: 600;">-</div>
        </div>
      </div>
      
      ${stackScores.insights.length > 0 ? `
      <div style="background: rgba(20,184,166,0.08); border-radius: 6px; padding: 12px; margin-top: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: #14B8A6; margin-bottom: 8px;">Key Insights</div>
        ${stackScores.insights.slice(0, 3).map(insight => `
          <div style="font-size: 12px; color: #ccc; margin-bottom: 6px; line-height: 1.4;">• ${insight.replace(/[🎯✅⚠️🚨💡📚]/g, '').trim()}</div>
        `).join('')}
      </div>` : ''}
    </div>

    <!-- Verdict -->
    <h2 style="font-size: 16px; font-weight: 600; color: #fff; margin: 0 0 12px;">The Verdict</h2>
    <p style="font-size: 14px; color: #ccc; line-height: 1.6; margin: 0 0 24px;">${report.verdict}</p>

    <!-- What's Working -->
    ${report.working.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #22c55e; margin: 0 0 12px;">✓ What's Working (${report.working.length})</h2>
    <div style="background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.2); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      ${report.working.map(w => `
        <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 14px; color: #fff; font-weight: 600; margin-bottom: 4px;">${w.name}</div>
          <div style="font-size: 13px; color: #aaa; line-height: 1.5;">${w.reason}</div>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- What's Wasting -->
    ${report.wasting.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #ef4444; margin: 0 0 12px;">✕ Wasting Your Money (${report.wasting.length})</h2>
    <div style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      ${report.wasting.map(w => `
        <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 14px; color: #fff; font-weight: 600; margin-bottom: 4px;">${w.name}</div>
          <div style="font-size: 13px; color: #aaa; line-height: 1.5; margin-bottom: 6px;">${w.reason}</div>
          <div style="font-size: 13px; color: #14B8A6; font-weight: 500;">→ ${w.recommendation}</div>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- What's Fighting -->
    ${report.fighting.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #f59e0b; margin: 0 0 12px;">⚠ Interactions to Fix (${report.fighting.length})</h2>
    <div style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      ${report.fighting.map(f => `
        <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 13px; color: #f59e0b; font-weight: 600; margin-bottom: 6px;">${f.ingredients.join(' + ')}</div>
          <div style="font-size: 13px; color: #ccc; line-height: 1.5; margin-bottom: 6px;">${f.interaction}</div>
          <div style="font-size: 13px; color: #14B8A6; font-weight: 500;">→ ${f.fix}</div>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- What's Missing -->
    ${report.missing.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #14B8A6; margin: 0 0 12px;">+ What You're Missing (${report.missing.length})</h2>
    <div style="background: rgba(20,184,166,0.05); border: 1px solid rgba(20,184,166,0.2); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      ${report.missing.map(m => `
        <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 14px; color: #14B8A6; font-weight: 600; margin-bottom: 4px;">${m.name}</div>
          <div style="font-size: 13px; color: #aaa; line-height: 1.5;">${m.reason}</div>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- Revised Stack -->
    ${report.revisedStack.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #14B8A6; margin: 0 0 12px;">Your Optimized Protocol</h2>
    <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      ${report.revisedStack.map(item => {
        const statusConfig: Record<string, { color: string; label: string }> = {
          keep: { color: "#22c55e", label: "KEEP" },
          remove: { color: "#ef4444", label: "DROP" },
          modify: { color: "#f59e0b", label: "MODIFY" },
          add: { color: "#14B8A6", label: "ADD" },
        };
        const s = statusConfig[item.status] || statusConfig.keep;
        return `
        <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11px; color: ${s.color}; font-weight: 700; margin-right: 10px;">${s.label}</span>
            <span style="font-size: 13px; color: #fff;">${item.name}</span>
            ${item.note ? `<span style="font-size: 12px; color: #888;"> · ${item.note}</span>` : ''}
          </div>
          <div style="font-size: 12px; color: #888;">
            ${item.dose || ''} ${item.timing ? `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 3px; margin-left: 6px;">${item.timing}</span>` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>` : ''}

    <!-- Clinical Evidence -->
    ${evidence.length > 0 ? `
    <h2 style="font-size: 16px; font-weight: 600; color: #fff; margin: 0 0 12px;">Clinical Evidence</h2>
    <div style="background: #111; border: 1px solid #222; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 12px; color: #888; margin-bottom: 12px;">Your stack is backed by ${evidence.length} published clinical studies:</div>
      ${evidence.slice(0, 5).map(e => `
        <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 13px; color: #14B8A6; font-weight: 600; margin-bottom: 4px;">${e.title}</div>
          <div style="font-size: 12px; color: #aaa; line-height: 1.5; margin-bottom: 4px;">${e.summary.substring(0, 150)}...</div>
          <div style="font-size: 11px; color: #666;">${e.citations.length} citation${e.citations.length > 1 ? 's' : ''} · ${e.evidenceTier} evidence</div>
        </div>
      `).join('')}
      ${evidence.length > 5 ? `<div style="font-size: 12px; color: #666; text-align: center; padding-top: 8px;">+ ${evidence.length - 5} more studies</div>` : ''}
    </div>` : ''}

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0 24px;">
      <a href="${url}" style="display: inline-block; background: #14B8A6; color: #0B1F3B; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 12px rgba(20,184,166,0.3);">View Full Protocol →</a>
    </div>

    <!-- Save to Account -->
    ${signInLink ? `
    <div style="margin-top: 28px; padding: 20px; background: rgba(20,184,166,0.06); border: 1px solid rgba(20,184,166,0.2); border-radius: 8px;">
      <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #E5F9F4; text-align: center;">Save this to your Vyvata account</p>
      <p style="margin: 0 0 14px; font-size: 12px; color: #9db6c7; text-align: center; line-height: 1.5;">One tap signs you in. See every protocol you've run, re-audit any time.</p>
      <p style="text-align: center; margin: 0;"><a href="${signInLink}" style="display: inline-block; background: rgba(20,184,166,0.12); border: 1px solid #14B8A6; color: #14B8A6; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 13px; text-decoration: none;">Save to my account →</a></p>
    </div>` : ''}

    <p style="font-size: 12px; color: #555; text-align: center; margin-top: 24px; line-height: 1.6;">Vyvata makes structure/function observations only. Not medical advice. For health conditions, consult a qualified healthcare provider.</p>
  </div>
</body>
</html>`;
}
