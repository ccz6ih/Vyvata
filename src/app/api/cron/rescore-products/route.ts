// GET /api/cron/rescore-products
// Vercel cron wrapper. Runs weekly after the compliance sync so fresh flags
// have already landed. Auth: Authorization: Bearer $CRON_SECRET (Vercel
// injects this automatically on scheduled invocations).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { rescoreProducts } from "@/lib/scoring/rescore-job";
import { hasAdminSession } from "@/lib/admin-auth";

export const maxDuration = 120;

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  const authorized = isAuthorizedCron(req) || (await hasAdminSession());
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const result = await rescoreProducts(supabase, { reason: "cron" });

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
