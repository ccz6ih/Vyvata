import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret, setAdminCookie, clearAdminCookie } from "@/lib/admin-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-auth:${ip}`, { max: 5, windowMs: 15 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }
  const { secret } = (await req.json().catch(() => ({}))) as { secret?: string };
  if (!verifyAdminSecret(secret ?? "")) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
