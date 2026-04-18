import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserMiddleware } from "@/lib/supabase-auth";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = getSupabaseUserMiddleware(req, res);
  // Refresh the session cookie if it's nearing expiry. getUser() triggers
  // Supabase's SSR helpers to rotate the cookies on `res` when needed.
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|logo/|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
