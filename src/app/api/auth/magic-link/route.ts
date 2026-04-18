// POST /api/auth/magic-link  { email } → sends a magic-link email
// Supabase Auth handles OTP generation + email delivery. When the user
// clicks the link they land on /auth/callback, which exchanges the code
// for a session cookie and redirects to `next` (or /me by default).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseUserServer } from "@/lib/supabase-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const Schema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

const GENERIC_OK = {
  ok: true,
  message: "If that email is valid, we've sent you a sign-in link.",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(GENERIC_OK);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const ip = getClientIp(req);
  const rl = checkRateLimit(`magic-link:${ip}:${email}`, {
    max: 3,
    windowMs: 15 * 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin;
  const nextPath = parsed.data.next || "/me";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const supabase = await getSupabaseUserServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[magic-link] supabase error:", error.message);
  }

  // Always return generic success so attackers can't enumerate emails.
  return NextResponse.json(GENERIC_OK);
}
