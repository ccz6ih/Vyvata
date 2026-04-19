/**
 * Probe: run each compliance ingester against prod Supabase and report
 * what it found. Addresses Brief 02 §3 (verify broken vs. "never ran").
 *
 * Runs the SAME functions the Monday cron calls — ingestOpenFdaRecalls,
 * ingestCaersEvents, ingestFdaWarningLetters — so whatever outcome we
 * see here is what the cron would produce if it fired now.
 *
 * Writes to compliance_flags if the ingesters succeed. Rows are
 * idempotent (UNIQUE source, source_id) so repeating this is safe.
 *
 *   npx tsx scripts/probe-compliance-ingest.ts
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient } from "@supabase/supabase-js";
import { ingestOpenFdaRecalls } from "../src/lib/compliance/openfda-recalls";
import { ingestCaersEvents } from "../src/lib/compliance/openfda-caers";
import { ingestFdaWarningLetters } from "../src/lib/compliance/fda-warning-letters";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: beforeRows } = await sb
    .from("compliance_flags")
    .select("id", { count: "exact", head: true });
  const before = (beforeRows as unknown as { count?: number } | null)?.count;
  console.log(`[probe] compliance_flags before: ${before ?? "(unknown)"}`);

  // 1. openFDA recalls — most likely to find data (daily updates, 2-year window)
  console.log("\n[probe] ingestOpenFdaRecalls (daysBack=730)");
  try {
    const t0 = Date.now();
    const result = await ingestOpenFdaRecalls(sb, { daysBack: 730 });
    console.log(
      `   fetched=${result.fetched} inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length} (${Date.now() - t0}ms)`
    );
    if (result.errors.length) console.log(`   first errors: ${result.errors.slice(0, 3).join("; ")}`);
  } catch (err) {
    console.log(`   THROW: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. openFDA CAERS — adverse events histogram
  console.log("\n[probe] ingestCaersEvents (daysBack=730, minCount=3)");
  try {
    const t0 = Date.now();
    const result = await ingestCaersEvents(sb, { daysBack: 730, minCount: 3 });
    console.log(
      `   fetched=${result.fetched} inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length} (${Date.now() - t0}ms)`
    );
    if (result.errors.length) console.log(`   first errors: ${result.errors.slice(0, 3).join("; ")}`);
  } catch (err) {
    console.log(`   THROW: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. FDA warning letters — scrapes Drupal DataTables endpoint
  console.log("\n[probe] ingestFdaWarningLetters (fulltext='dietary supplement')");
  try {
    const t0 = Date.now();
    const result = await ingestFdaWarningLetters(sb, {
      fulltext: "dietary supplement",
      length: 250,
    });
    console.log(
      `   fetched=${result.fetched} inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length} (${Date.now() - t0}ms)`
    );
    if (result.errors.length) console.log(`   first errors: ${result.errors.slice(0, 3).join("; ")}`);
  } catch (err) {
    console.log(`   THROW: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. Post-run snapshot
  const { data: afterRows } = await sb
    .from("compliance_flags")
    .select("id", { count: "exact", head: true });
  const after = (afterRows as unknown as { count?: number } | null)?.count;

  const { data: bySource } = await sb
    .from("compliance_flags")
    .select("source")
    .limit(1000);
  const counts = (bySource ?? []).reduce<Record<string, number>>((acc, r) => {
    const s = (r as { source: string }).source;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n[probe] compliance_flags after: ${after ?? "(unknown)"}`);
  console.log(`[probe] by source:`);
  for (const [src, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${n.toString().padStart(4)}  ${src}`);
  }

  // Match-confidence breakdown — matched flags matter for scoring;
  // unmatched are noise until manually resolved.
  const { data: byMatch } = await sb
    .from("compliance_flags")
    .select("match_confidence")
    .limit(1000);
  const matches = (byMatch ?? []).reduce<Record<string, number>>((acc, r) => {
    const m = (r as { match_confidence: string }).match_confidence;
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[probe] by match_confidence:`);
  for (const [m, n] of Object.entries(matches).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${n.toString().padStart(4)}  ${m}`);
  }
}

main().catch((err) => {
  console.error("[probe] FATAL", err);
  process.exit(1);
});
