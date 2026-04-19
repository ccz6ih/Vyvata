// Shared helpers for cron route handlers.
// Cron endpoints accept either a Vercel-signed Authorization: Bearer $CRON_SECRET
// header, or an authenticated admin session (so an admin can manually trigger
// via curl with cookies, or wire a "Run now" button in the admin UI).

import type { NextRequest } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";

export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function authorizeCronRequest(req: NextRequest): Promise<boolean> {
  return isAuthorizedCron(req) || (await hasAdminSession());
}
