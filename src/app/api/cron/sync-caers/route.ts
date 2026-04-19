// GET/POST /api/cron/sync-caers
// Per-source cron: openFDA CAERS (adverse events) only.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { ingestCaersEvents } from "@/lib/compliance/openfda-caers";
import { wrapScraperRun } from "@/lib/scraper-observability";
import { authorizeCronRequest } from "../_shared";

export const maxDuration = 120;

async function handle(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServer();
  const result = await wrapScraperRun(
    "openfda_caers",
    async (rec) => {
      const r = await ingestCaersEvents(supabase, { daysBack: 730, minCount: 3 });
      rec.count(r.inserted, r.updated);
      rec.note({ fetched: r.fetched, skipped: r.skipped, errorCount: r.errors.length });
      if (r.errors.length > 0) {
        rec.partial(`${r.errors.length} per-item errors`);
        rec.note({ sampleErrors: r.errors.slice(0, 3) });
      }
      return r;
    },
    { supabase }
  );
  return NextResponse.json({
    ok: result.errors.length === 0,
    source: "caers",
    ...result,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
