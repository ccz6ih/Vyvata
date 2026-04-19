// GET/POST /api/cron/sync-recalls
// Per-source cron: openFDA food enforcement (recalls) only. Split out from
// the unified /api/admin/compliance/sync so a single flaky source doesn't
// take down the whole pipeline — each source can retry independently and
// each shows up as its own Vercel cron log.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { ingestOpenFdaRecalls } from "@/lib/compliance/openfda-recalls";
import { authorizeCronRequest } from "../_shared";

export const maxDuration = 120;

async function handle(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServer();
  const result = await ingestOpenFdaRecalls(supabase, { daysBack: 730 });
  return NextResponse.json({
    ok: result.errors.length === 0,
    source: "openfda_recall",
    ...result,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
