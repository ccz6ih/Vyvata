/**
 * Rescore idempotency test — runs rescoreProducts() twice in a row and
 * asserts that the second run produces 0 new rows (everything is skipped).
 * If this fails, the skip-if-unchanged comparison in rescore-job.ts is
 * broken, and every weekly cron would pile up duplicate product_scores rows.
 *
 * Usage:
 *   npx tsx scripts/test-rescore-idempotency.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { rescoreProducts } from "../src/lib/scoring/rescore-job";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("[idem] run 1 (warms state)");
  const first = await rescoreProducts(sb, { reason: "manual" });
  console.log(
    `[idem] run 1: considered=${first.considered} rescored=${first.rescored} skipped=${first.skipped} tierChanges=${first.tierChanges.length} errors=${first.errors.length}`
  );

  console.log("[idem] run 2 (should be all-skip)");
  const second = await rescoreProducts(sb, { reason: "manual" });
  console.log(
    `[idem] run 2: considered=${second.considered} rescored=${second.rescored} skipped=${second.skipped} tierChanges=${second.tierChanges.length} errors=${second.errors.length}`
  );

  if (second.rescored !== 0 || second.tierChanges.length !== 0) {
    console.error(
      `[idem] FAIL  second run produced ${second.rescored} new rows / ${second.tierChanges.length} tier changes. Skip-if-unchanged is broken.`
    );
    process.exit(1);
  }
  if (second.skipped !== second.considered) {
    console.error(
      `[idem] FAIL  expected skipped=considered (${second.considered}), got skipped=${second.skipped}`
    );
    process.exit(1);
  }

  console.log(`[idem] OK  ${second.considered} products, 0 duplicates created`);
}

main().catch((err) => {
  console.error("[idem] ERROR", err);
  process.exit(1);
});
