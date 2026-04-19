/**
 * FDA warning letters selector regression — fetches the live Drupal
 * DataTables endpoint and asserts the parser returns a plausible number of
 * rows. FDA ships Drupal column re-orderings with no warning and we'd
 * silently stop ingesting; this catches that drift before the cron runs.
 *
 * "Plausible" here: at least 5 rows returned. The dietary-supplement fulltext
 * query routinely pulls back 100+ historical letters, so 5 is a floor, not
 * a tight bound — it's there to catch "parser yielded zero" without yelling
 * about week-to-week variance.
 *
 * Usage:
 *   npx tsx scripts/test-warning-letters-selector.ts
 *   npx tsx scripts/test-warning-letters-selector.ts "dietary supplement"
 */

import { fetchFdaWarningLetters } from "../src/lib/compliance/fda-warning-letters";

const MIN_EXPECTED = 5;

async function main() {
  const fulltext = process.argv[2] || "dietary supplement";
  console.log(`[wl-selector] fetch fulltext="${fulltext}"`);

  const letters = await fetchFdaWarningLetters({ fulltext, length: 100 });
  console.log(`[wl-selector] parsed ${letters.length} letters`);

  if (letters.length < MIN_EXPECTED) {
    console.error(
      `[wl-selector] FAIL  parser returned ${letters.length} rows (expected >= ${MIN_EXPECTED}). FDA may have changed the DataTables column order — see src/lib/compliance/fda-warning-letters.ts parseFdaWarningLetters comments.`
    );
    process.exit(1);
  }

  // Spot-check field quality: every row should have company + letterUrl.
  const bad = letters.filter((l) => !l.company || !l.letterUrl).length;
  if (bad > 0) {
    console.error(
      `[wl-selector] FAIL  ${bad}/${letters.length} rows missing company or letterUrl. Column order probably drifted.`
    );
    process.exit(1);
  }

  const dated = letters.filter((l) => l.issuedDate).length;
  const withOffice = letters.filter((l) => l.issuingOffice).length;

  console.log(
    `[wl-selector] OK  ${letters.length} rows · ${dated} dated · ${withOffice} with issuing office`
  );
  console.log(`[wl-selector] sample:`, {
    company: letters[0].company,
    issuedDate: letters[0].issuedDate,
    issuingOffice: letters[0].issuingOffice,
    subject: letters[0].subject.slice(0, 80),
    letterUrl: letters[0].letterUrl,
  });
}

main().catch((err) => {
  console.error("[wl-selector] ERROR", err);
  process.exit(1);
});
