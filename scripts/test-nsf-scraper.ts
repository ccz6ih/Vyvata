/**
 * Local smoke for the NSF Sport scraper. Fetches the real registry and
 * prints what matches for a set of known-certified brands. Use after
 * editing src/lib/scrapers/nsf-sport.ts to confirm parsing still works
 * before shipping.
 *
 *   npx tsx scripts/test-nsf-scraper.ts
 */

import { nsfSportScraper } from "../src/lib/scrapers/nsf-sport";

async function main() {
  console.log("[nsf] loading registry (one-time fetch of the full list)");
  const listings = await nsfSportScraper.loadRegistry();
  console.log(`[nsf] total listings: ${listings.length}`);

  const brands = ["Thorne", "Klean Athlete", "Momentous", "Garden of Life", "BulkSupplements.com"];
  for (const brand of brands) {
    const all = listings.filter((l) => l.brand.toLowerCase() === brand.toLowerCase());
    console.log(`\n[nsf] brand=${brand} (${all.length} listings)`);
    for (const l of all.slice(0, 5)) {
      console.log(`   - ${l.productName}  (${l.detailUrl})`);
    }
    if (all.length > 5) console.log(`   ... and ${all.length - 5} more`);
  }

  // Targeted product match — mirrors what the cert-sync orchestrator does
  // per Vyvata product.
  const probes: Array<{ brand: string; productName: string }> = [
    { brand: "Thorne", productName: "Magnesium Bisglycinate" },
    { brand: "Thorne", productName: "Creatine" },
    { brand: "Momentous", productName: "Creatine" },
    { brand: "Nordic Naturals", productName: "Omega-3" },
  ];
  console.log("\n[nsf] per-product findMatches()");
  for (const p of probes) {
    const matches = await nsfSportScraper.findMatches(p.brand, p.productName);
    const marker = matches.length > 0 ? "OK" : "--";
    console.log(`  ${marker} ${p.brand} / ${p.productName}  ->  ${matches.length} match${matches.length === 1 ? "" : "es"}`);
    for (const m of matches.slice(0, 3)) {
      console.log(`      * ${m.productName}`);
    }
  }
}

main().catch((err) => {
  console.error("[nsf] ERROR", err);
  process.exit(1);
});
