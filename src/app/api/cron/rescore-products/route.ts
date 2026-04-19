// GET /api/cron/rescore-products
// Vercel cron wrapper. Runs weekly after the compliance sync so fresh flags
// have already landed. Auth: Authorization: Bearer $CRON_SECRET (Vercel
// injects this automatically on scheduled invocations).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { rescoreProducts } from "@/lib/scoring/rescore-job";
import { notifyPractitionersOfTierChanges } from "@/lib/scoring/notify-tier-changes";
import { wrapScraperRun } from "@/lib/scraper-observability";
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
  const result = await wrapScraperRun(
    "rescore_products",
    async (rec) => {
      const r = await rescoreProducts(supabase, { reason: "cron" });
      // "rescored" = new product_scores rows written; track as inserted.
      // "skipped" = no-op (score unchanged from prior row); track in notes.
      rec.count(r.rescored, 0);
      rec.note({
        considered: r.considered,
        skipped: r.skipped,
        tierChanges: r.tierChanges.length,
        errorCount: r.errors.length,
      });
      if (r.errors.length > 0) {
        rec.partial(`${r.errors.length} products errored during rescore`);
        rec.note({ sampleErrors: r.errors.slice(0, 3) });
      }
      return r;
    },
    { supabase }
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const notifications = await notifyPractitionersOfTierChanges(
    supabase,
    result.tierChanges,
    { appUrl }
  );

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
    notifications,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
