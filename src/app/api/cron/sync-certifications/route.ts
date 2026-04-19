// GET/POST /api/cron/sync-certifications
// Weekly cron: walks the catalog, hits NSF Sport / USP Verified / Informed
// Sport directories per product, and persists any new certifications. Split
// from the compliance ingesters because it's rate-limited against third-party
// sites (see src/lib/scrapers/rate-limiter.ts) and runs longer.

import { NextRequest, NextResponse } from "next/server";
import { syncAllProductCertifications } from "@/lib/scrapers/certification-sync";
import { wrapScraperRun } from "@/lib/scraper-observability";
import { authorizeCronRequest } from "../_shared";

// Cert scrapers fan out to three external sites per product — a full sweep of
// 70 products can approach the longer timeout window.
export const maxDuration = 300;

async function handle(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await wrapScraperRun("certifications", async (rec) => {
    const r = await syncAllProductCertifications();
    // syncAllProductCertifications returns { synced, errors, results } —
    // "synced" is the count of products that had at least one cert added
    // and "errors" is a count (not an array), so translate to the
    // observability shape.
    rec.count(r.synced, 0);
    rec.note({ totalProducts: r.results.length, errorProducts: r.errors });
    if (r.errors > 0) {
      rec.partial(`${r.errors} products errored during cert sync`);
    }
    return r;
  });
  return NextResponse.json({
    ok: result.errors === 0,
    source: "certifications",
    synced: result.synced,
    errors: result.errors,
    totalProducts: result.results.length,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
