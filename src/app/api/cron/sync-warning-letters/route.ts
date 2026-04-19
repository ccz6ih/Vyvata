// GET/POST /api/cron/sync-warning-letters
// Per-source cron: FDA warning letters only. Lives separately from the
// openFDA endpoints because it scrapes a Drupal DataTables endpoint (brittle
// to selector changes) and we want its failures to stay contained.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { ingestFdaWarningLetters } from "@/lib/compliance/fda-warning-letters";
import { authorizeCronRequest } from "../_shared";

export const maxDuration = 120;

async function handle(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServer();
  const result = await ingestFdaWarningLetters(supabase, {
    fulltext: "dietary supplement",
    length: 250,
  });
  return NextResponse.json({
    ok: result.errors.length === 0,
    source: "fda_warning_letter",
    ...result,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
