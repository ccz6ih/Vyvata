// GET/POST /api/cron/sync-caers
// Per-source cron: openFDA CAERS (adverse events) only.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { ingestCaersEvents } from "@/lib/compliance/openfda-caers";
import { authorizeCronRequest } from "../_shared";

export const maxDuration = 120;

async function handle(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServer();
  const result = await ingestCaersEvents(supabase, { daysBack: 730, minCount: 3 });
  return NextResponse.json({
    ok: result.errors.length === 0,
    source: "caers",
    ...result,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
