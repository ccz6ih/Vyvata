// GET/POST /api/cron/sync-warning-letters
// Per-source cron: FDA warning letters only. Lives separately from the
// openFDA endpoints because it scrapes a Drupal DataTables endpoint (brittle
// to selector changes) and we want its failures to stay contained.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { ingestFdaWarningLetters } from "@/lib/compliance/fda-warning-letters";
import { wrapScraperRun } from "@/lib/scraper-observability";
import { authorizeCronRequest } from "../_shared";

export const maxDuration = 120;

async function handle(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServer();
  const result = await wrapScraperRun(
    "fda_warning_letters",
    async (rec) => {
      // 5 pages of 10 letters each = ~50 most recent supplement letters.
      // Daily cron catches new ones within 24h of posting.
      const r = await ingestFdaWarningLetters(supabase, {
        fulltext: "dietary supplement",
        pages: 5,
      });
      rec.count(r.inserted, r.updated);
      rec.note({ fetched: r.fetched, skipped: r.skipped, errorCount: r.errors.length });
      if (r.errors.length > 0) {
        rec.partial(`${r.errors.length} per-letter errors`);
        rec.note({ sampleErrors: r.errors.slice(0, 3) });
      }
      return r;
    },
    { supabase }
  );
  return NextResponse.json({
    ok: result.errors.length === 0,
    source: "fda_warning_letter",
    ...result,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
