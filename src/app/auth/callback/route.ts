// GET /auth/callback?code=...&next=/me
// Supabase Auth redirects here after the user clicks their magic link.
// We exchange the code for a session (cookies set via middleware helpers)
// and redirect to the post-login destination.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserServer } from "@/lib/supabase-auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/me";
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(error)}`, url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=missing_code", url));
  }

  const supabase = await getSupabaseUserServer();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchange error:", exchangeError.message);
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(exchangeError.message)}`, url));
  }

  return NextResponse.redirect(new URL(next, url));
}
