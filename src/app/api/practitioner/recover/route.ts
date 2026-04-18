// POST /api/practitioner/recover
// Body: { email }
// For approved + active practitioners: generate a new access code, invalidate
// existing sessions, email the new code. Always returns the same message so
// attackers can't enumerate which emails exist.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { Resend } from "resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RecoverSchema = z.object({
  email: z.string().email(),
});

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment(4)}-${segment(4)}`;
}

const GENERIC_RESPONSE = {
  ok: true,
  message: "If an approved account exists for that email, a new access code has been sent.",
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const parsed = RecoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const rl = checkRateLimit(`prac-recover:${ip}:${email}`, {
      max: 3,
      windowMs: 60 * 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const supabase = getSupabaseServer();

    const { data: prac } = await supabase
      .from("practitioners")
      .select("id, name, email, verification_status, is_active")
      .eq("email", email)
      .single();

    if (!prac || prac.verification_status !== "approved" || !prac.is_active) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const newCode = generateAccessCode();

    const { error: updateError } = await supabase
      .from("practitioners")
      .update({ access_code: newCode, updated_at: new Date().toISOString() })
      .eq("id", prac.id);

    if (updateError) {
      console.error("Recover code update error:", updateError);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    await supabase.from("practitioner_sessions").delete().eq("practitioner_id", prac.id);

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from:    "Vyvata <hello@vyvata.com>",
          to:      prac.email as string,
          subject: "Your new Vyvata access code",
          html:    recoveryEmailHtml(prac.name as string, prac.email as string, newCode),
        });
      } catch (err) {
        console.error("Recovery email error:", err);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("Recover error:", err);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}

function recoveryEmailHtml(name: string, email: string, accessCode: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Vyvata access code</title></head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">VYVATA</span>
        </td></tr>
        <tr><td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">Access Code Reset</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;">Hi ${firstName}, here's your new code</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#7A90A8;line-height:1.6;">You asked to reset your access code. Your previous code is no longer valid. Any active sessions have been signed out.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.25);border-radius:12px;padding:20px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:3px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">New Access Code</p>
              <p style="margin:0;font-size:28px;font-weight:900;color:#E8F0F5;letter-spacing:6px;font-family:monospace;">${accessCode}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 20px;font-size:12px;color:#4a6080;line-height:1.6;">If you didn't request this, contact <a href="mailto:hello@vyvata.com" style="color:#14B8A6;text-decoration:none;">hello@vyvata.com</a> — this code replaced your old one.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://vyvata.com"}/practitioner/login" style="display:inline-block;background:linear-gradient(135deg,#14B8A6,#0F766E);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;padding:14px 28px;border-radius:10px;text-decoration:none;">Sign in with new code →</a>
          <p style="margin:20px 0 0;font-size:12px;color:#4a6080;">Signing in as: <strong style="color:#C9D6DF;">${email}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
