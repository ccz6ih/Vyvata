// POST /api/practitioner/auth   — login (email + access code)
// DELETE /api/practitioner/auth — logout

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPractitionerSession, revokePractitionerSession, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/practitioner-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email:      z.string().email(),
  accessCode: z.string().min(4).max(32),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(`prac-auth:${ip}:${parsed.data.email.toLowerCase()}`, {
      max: 5,
      windowMs: 15 * 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const result = await createPractitionerSession(parsed.data.email, parsed.data.accessCode);

    if ("error" in result) {
      if (result.error === "pending") {
        return NextResponse.json(
          { error: "Your application is still under review. Check your email for updates.", code: "pending" },
          { status: 401 }
        );
      }
      if (result.error === "rejected") {
        return NextResponse.json(
          { error: "Your application was not approved. Contact hello@vyvata.com for support.", code: "rejected" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Invalid email or access code.", code: "invalid" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true, practitioner: result.practitioner });

    response.cookies.set(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    await revokePractitionerSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
