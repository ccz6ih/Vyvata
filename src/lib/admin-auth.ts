import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "vv_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

function getConfiguredSecret(): string | null {
  const secret = process.env.VYVATA_ADMIN_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Server-side check used by protected routes and page components. */
export async function hasAdminSession(): Promise<boolean> {
  const secret = getConfiguredSecret();
  if (!secret) return false;
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return timingSafeEqual(token, secret);
}

/** Validate a secret submitted at login. */
export function verifyAdminSecret(candidate: string): boolean {
  const secret = getConfiguredSecret();
  if (!secret || !candidate) return false;
  return timingSafeEqual(candidate, secret);
}

export function setAdminCookie(res: NextResponse): void {
  const secret = getConfiguredSecret();
  if (!secret) return;
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
