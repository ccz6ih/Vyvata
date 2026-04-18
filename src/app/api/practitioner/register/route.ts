// POST /api/practitioner/register
// Validates intake form, creates a pending practitioner row, generates an access code
// (stored in DB but NOT emailed until admin approves), sends a confirmation email via Resend.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { Resend } from "resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ── Zod schema ────────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name:             z.string().min(2).max(120),
  email:            z.string().email(),
  credential:       z.string().min(1).max(20),
  license_number:   z.string().max(80).optional(),
  specialty:        z.string().min(1).max(80),
  organization:     z.string().max(120).optional(),
  practice_type:    z.string().min(1).max(40),
  practice_website: z.string().url().optional().or(z.literal("")),
  patient_volume:   z.string().min(1).max(20),
  use_case:         z.string().min(10).max(2000),
});

// ── Access code generator ─────────────────────────────────────────────────────
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/1/0 for readability
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment(4)}-${segment(4)}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`prac-register:${ip}`, {
      max: 3,
      windowMs: 60 * 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many applications from this network. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: `${firstError.path.join(".")}: ${firstError.message}` },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const supabase = getSupabaseServer();

    // ── Duplicate email check ──────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("practitioners")
      .select("id, verification_status")
      .eq("email", d.email.toLowerCase().trim())
      .single();

    if (existing) {
      const status = existing.verification_status as string;
      if (status === "pending") {
        return NextResponse.json(
          { error: "An application for this email is already under review." },
          { status: 409 }
        );
      }
      if (status === "approved") {
        return NextResponse.json(
          { error: "An account with this email already exists. Sign in instead." },
          { status: 409 }
        );
      }
      if (status === "rejected") {
        return NextResponse.json(
          { error: "A previous application from this email was not approved. Contact hello@vyvata.com for support." },
          { status: 409 }
        );
      }
    }

    // ── Generate access code ───────────────────────────────────────────────────
    const accessCode = generateAccessCode();

    // ── Insert practitioner row ────────────────────────────────────────────────
    const { data: newPrac, error: insertError } = await supabase
      .from("practitioners")
      .insert({
        name:                d.name.trim(),
        email:               d.email.toLowerCase().trim(),
        credential:          d.credential,
        license_number:      d.license_number?.trim() || null,
        specialty:           d.specialty,
        organization:        d.organization?.trim() || null,
        practice_type:       d.practice_type,
        practice_website:    d.practice_website?.trim() || null,
        patient_volume:      d.patient_volume,
        use_case:            d.use_case.trim(),
        access_code:         accessCode,       // stored but NOT sent until approved
        verification_status: "pending",
        is_verified:         false,
        is_active:           false,
        registered_at:       new Date().toISOString(),
        tier:                "standard",
        patient_count:       0,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create application. Please try again." }, { status: 500 });
    }
    if (!newPrac) {
      return NextResponse.json({ error: "Failed to create application." }, { status: 500 });
    }

    // ── Send confirmation email via Resend ─────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from:    "Vyvata <hello@vyvata.com>",
          to:      d.email,
          subject: "Application received — Vyvata Practitioner Network",
          html: confirmationEmailHtml(d.name),
        });
      } catch (emailErr) {
        // Non-fatal: log but don't fail the registration
        console.error("Confirmation email error:", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Email template ────────────────────────────────────────────────────────────
function confirmationEmailHtml(name: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vyvata — Application Received</title>
</head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo row -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">
                VYVATA
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">

              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">
                Application Received
              </p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;line-height:1.2;">
                Thanks, ${firstName}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#7A90A8;line-height:1.6;">
                We&apos;ve received your application to join the Vyvata practitioner network. Our team reviews every application carefully.
              </p>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${[
                  ["1", "Application submitted", "Complete"],
                  ["2", "Credential review by Vyvata team", "Usually within 24 hours"],
                  ["3", "Access code delivered by email", "Sent upon approval"],
                ].map(([n, title, sub]) => `
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;height:28px;background:rgba(20,184,166,0.12);border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;color:#14B8A6;padding:0;">
                          ${n}
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <span style="display:block;font-size:13px;font-weight:600;color:#C9D6DF;">${title}</span>
                          <span style="display:block;font-size:12px;color:#4a6080;">${sub}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>

              <p style="margin:0 0 28px;font-size:14px;color:#7A90A8;line-height:1.6;">
                If you have questions, reply to this email or reach us at
                <a href="mailto:hello@vyvata.com" style="color:#14B8A6;text-decoration:none;">hello@vyvata.com</a>.
              </p>

              <a
                href="https://vyvata.com/practitioner/login"
                style="display:inline-block;background:linear-gradient(135deg,#14B8A6,#0F766E);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;padding:14px 28px;border-radius:10px;text-decoration:none;"
              >
                Sign in when approved →
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a6080;">
                © Vyvata · AI-powered supplement intelligence<br/>
                You&apos;re receiving this because you applied to the practitioner network.
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
