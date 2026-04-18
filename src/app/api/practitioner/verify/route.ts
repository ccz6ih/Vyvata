// POST /api/practitioner/verify
// Admin-only endpoint to approve or reject a pending practitioner application.
// Protected by: Authorization: Bearer <VYVATA_ADMIN_SECRET>
//
// Body: { email: string, action: "approve" | "reject", rejectionReason?: string }
// On approve: sets is_verified=true, is_active=true, verification_status="approved", verified_at=now()
//             then emails the practitioner their access code via Resend
// On reject:  sets verification_status="rejected", rejection_reason
//             then emails a polite rejection notice

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { Resend } from "resend";

// ── Zod ───────────────────────────────────────────────────────────────────────
const VerifySchema = z.object({
  email:           z.string().email(),
  action:          z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const adminSecret = process.env.VYVATA_ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin secret not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${firstError.path.join(".")}: ${firstError.message}` },
      { status: 400 }
    );
  }

  const { email, action, rejectionReason } = parsed.data;
  const supabase = getSupabaseServer();

  // ── Fetch practitioner ────────────────────────────────────────────────────────
  const { data: prac, error: fetchError } = await supabase
    .from("practitioners")
    .select("id, name, email, access_code, verification_status")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (fetchError || !prac) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  if (prac.verification_status === "approved") {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  const now = new Date().toISOString();

  // ── Approve ───────────────────────────────────────────────────────────────────
  if (action === "approve") {
    const { error: updateError } = await supabase
      .from("practitioners")
      .update({
        is_verified:         true,
        is_active:           true,
        verification_status: "approved",
        verified_at:         now,
        // verified_by: could pass an admin identifier in body if needed
      })
      .eq("id", prac.id);

    if (updateError) {
      console.error("Approve update error:", updateError);
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }

    // ── Send access code email ─────────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && prac.access_code) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from:    "Vyvata <hello@vyvata.com>",
          to:      prac.email as string,
          subject: "You're approved — here's your Vyvata access code",
          html:    approvalEmailHtml(prac.name as string, prac.email as string, prac.access_code as string),
        });
      } catch (emailErr) {
        console.error("Approval email error:", emailErr);
        // Non-fatal: the account is approved; admin can resend manually
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${prac.email} approved and access code emailed.`,
    });
  }

  // ── Reject ────────────────────────────────────────────────────────────────────
  if (action === "reject") {
    const { error: updateError } = await supabase
      .from("practitioners")
      .update({
        is_verified:         false,
        is_active:           false,
        verification_status: "rejected",
        rejection_reason:    rejectionReason?.trim() || null,
      })
      .eq("id", prac.id);

    if (updateError) {
      console.error("Reject update error:", updateError);
      return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
    }

    // ── Send rejection email ───────────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from:    "Vyvata <hello@vyvata.com>",
          to:      prac.email as string,
          subject: "Update on your Vyvata practitioner application",
          html:    rejectionEmailHtml(prac.name as string, rejectionReason),
        });
      } catch (emailErr) {
        console.error("Rejection email error:", emailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${prac.email} rejected.`,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ── Email templates ────────────────────────────────────────────────────────────
function approvalEmailHtml(name: string, email: string, accessCode: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're approved — Vyvata</title>
</head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">
                VYVATA
              </span>
            </td>
          </tr>

          <tr>
            <td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">

              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">
                You're Approved
              </p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;line-height:1.2;">
                Welcome to Vyvata, ${firstName}
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#7A90A8;line-height:1.6;">
                Your practitioner application has been approved. Use your personal access code below to sign in.
              </p>

              <!-- Access code box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.25);border-radius:12px;padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:3px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">
                      Your Access Code
                    </p>
                    <p style="margin:0;font-size:28px;font-weight:900;color:#E8F0F5;letter-spacing:6px;font-family:monospace;">
                      ${accessCode}
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;color:#4a6080;">
                      Keep this code private. Use it every time you sign in.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Sign in info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7A90A8;text-transform:uppercase;letter-spacing:2px;">Sign-in details</p>
                    <p style="margin:0;font-size:13px;color:#C9D6DF;">Email: <strong>${email}</strong></p>
                    <p style="margin:4px 0 0;font-size:13px;color:#C9D6DF;">Access code: <strong style="letter-spacing:3px;font-family:monospace;">${accessCode}</strong></p>
                  </td>
                </tr>
              </table>

              <a
                href="https://vyvata.com/practitioner/login"
                style="display:inline-block;background:linear-gradient(135deg,#14B8A6,#0F766E);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;padding:14px 28px;border-radius:10px;text-decoration:none;"
              >
                Sign in to your dashboard →
              </a>

            </td>
          </tr>

          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a6080;">
                © Vyvata · AI-powered supplement intelligence<br/>
                Questions? <a href="mailto:hello@vyvata.com" style="color:#14B8A6;text-decoration:none;">hello@vyvata.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function rejectionEmailHtml(name: string, reason?: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vyvata Application Update</title>
</head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">
                VYVATA
              </span>
            </td>
          </tr>

          <tr>
            <td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">

              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#7A90A8;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">
                Application Update
              </p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;line-height:1.2;">
                Hi ${firstName},
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#7A90A8;line-height:1.6;">
                Thank you for applying to the Vyvata practitioner network. After review, we weren't able to approve your application at this time.
              </p>

              ${reason ? `
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#7A90A8;text-transform:uppercase;letter-spacing:2px;">Note from our team</p>
                <p style="margin:0;font-size:14px;color:#C9D6DF;line-height:1.6;">${reason}</p>
              </div>` : ""}

              <p style="margin:0 0 28px;font-size:14px;color:#7A90A8;line-height:1.6;">
                If you believe this is an error or have additional information to share, please reach out at
                <a href="mailto:hello@vyvata.com" style="color:#14B8A6;text-decoration:none;">hello@vyvata.com</a>.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a6080;">
                © Vyvata · AI-powered supplement intelligence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
