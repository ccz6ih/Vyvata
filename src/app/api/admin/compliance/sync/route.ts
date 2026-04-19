// POST /api/admin/compliance/sync
// Runs every wired ingester in sequence. Returns per-source results so the
// admin UI can show a breakdown. Also accepts Authorization: Bearer <CRON_SECRET>
// so Vercel cron can hit this without a session cookie.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";
import { ingestOpenFdaRecalls } from "@/lib/compliance/openfda-recalls";
import { ingestCaersEvents } from "@/lib/compliance/openfda-caers";
import { ingestFdaWarningLetters } from "@/lib/compliance/fda-warning-letters";

// openFDA calls can take a moment to return when the federal API is slow.
export const maxDuration = 120;

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  const authorized = (await hasAdminSession()) || isAuthorizedCron(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const [recalls, caers, warningLetters] = await Promise.all([
    ingestOpenFdaRecalls(supabase, { daysBack: 730 }),
    ingestCaersEvents(supabase, { daysBack: 730, minCount: 3 }),
    ingestFdaWarningLetters(supabase, { fulltext: "dietary supplement", length: 250 }),
  ]);

  const totalInserted = recalls.inserted + caers.inserted + warningLetters.inserted;
  const totalUpdated  = recalls.updated  + caers.updated  + warningLetters.updated;
  const totalErrors   = recalls.errors.length + caers.errors.length + warningLetters.errors.length;

  return NextResponse.json({
    ok: totalErrors === 0,
    totals: { inserted: totalInserted, updated: totalUpdated, errors: totalErrors },
    sources: {
      openfda_recall: recalls,
      caers,
      fda_warning_letter: warningLetters,
    },
    ranAt: new Date().toISOString(),
  });
}

// GET same route for cron schedulers that only issue GET (Vercel's native
// Cron supports both, but some external schedulers are GET-only). Re-uses
// the POST handler via internal dispatch.
export async function GET(req: NextRequest) {
  return POST(req);
}
