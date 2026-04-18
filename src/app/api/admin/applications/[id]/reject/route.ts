// POST /api/admin/applications/[id]/reject
// Body: { reason?: string }
// Protected by Authorization: Bearer <VYVATA_ADMIN_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { Resend } from "resend";

function checkAuth(req: NextRequest): boolean {
  const adminSecret = process.env.VYVATA_ADMIN_SECRET;
  if (!adminSecret) return false;
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return token === adminSecret;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = typeof body.reason === "string" ? body.reason.trim() : undefined;
  } catch {
    // reason is optional; ignore parse errors
  }

  const supabase = getSupabaseServer();

  const { data: prac, error: fetchError } = await supabase
    .from("practitioners")
    .select("id, name, email, verification_status")
    .eq("id", id)
    .single();

  if (fetchError || !prac) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("practitioners")
    .update({
      is_verified:         false,
      is_active:           false,
      verification_status: "rejected",
      rejection_reason:    reason || null,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Reject error:", updateError);
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }

  // Send rejection email
  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:    "Vyvata <hello@vyvata.com>",
        to:      prac.email as string,
        subject: "Update on your Vyvata practitioner application",
        html:    rejectionEmailHtml(prac.name as string, reason),
      });
      emailSent = true;
    } catch (err) {
      console.error("Rejection email error:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    message: `${prac.email} rejected.`,
  });
}

function rejectionEmailHtml(name: string, reason?: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Vyvata Application Update</title></head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">VYVATA</span>
        </td></tr>
        <tr><td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#7A90A8;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">Application Update</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;">Hi ${firstName},</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#7A90A8;line-height:1.6;">Thank you for applying to the Vyvata practitioner network. After review, we weren't able to approve your application at this time.</p>
          ${reason ? `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#7A90A8;text-transform:uppercase;letter-spacing:2px;">Note from our team</p>
            <p style="margin:0;font-size:14px;color:#C9D6DF;line-height:1.6;">${reason}</p>
          </div>` : ""}
          <p style="margin:0 0 28px;font-size:14px;color:#7A90A8;line-height:1.6;">If you believe this is an error, please reach out at <a href="mailto:hello@vyvata.com" style="color:#14B8A6;text-decoration:none;">hello@vyvata.com</a>.</p>
        </td></tr>
        <tr><td style="padding-top:28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4a6080;">© Vyvata · AI-powered supplement intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
