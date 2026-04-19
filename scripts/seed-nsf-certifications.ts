/**
 * Brief 03 Step B — NSF Sport certification seeding.
 *
 * Walks the full product catalog, matches each (brand, productName)
 * pair against the live NSF Sport registry, and upserts a
 * `certifications` row per match. Uses the NSFSportScraper's in-memory
 * registry cache — one HTTP round-trip for the whole catalog.
 *
 * Never fabricates rows. If NSF doesn't list a brand, no cert is
 * created — that's the correct behavior (Brief 03 §Constraints).
 *
 * Usage:
 *   npx tsx scripts/seed-nsf-certifications.ts --dry-run
 *   npx tsx scripts/seed-nsf-certifications.ts
 *   npx tsx scripts/seed-nsf-certifications.ts --brand "Thorne"   # single brand
 *
 * Idempotent via onConflict: (product_id, type). Running twice writes
 * once; the second run skips.
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient } from "@supabase/supabase-js";
import { nsfSportScraper } from "../src/lib/scrapers/nsf-sport";

interface Args {
  dryRun: boolean;
  brandFilter: string | null;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const brandIdx = argv.findIndex((a) => a === "--brand");
  const brandFilter = brandIdx >= 0 ? argv[brandIdx + 1] ?? null : null;
  return { dryRun, brandFilter };
}

interface ProductRow {
  id: string;
  brand: string;
  name: string;
}

async function main() {
  const { dryRun, brandFilter } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log(`[seed-nsf] ${dryRun ? "DRY RUN" : "LIVE"} mode${brandFilter ? `, brand filter: ${brandFilter}` : ""}`);

  // 1. Fetch all active products (scoped by brand if --brand set).
  let query = sb
    .from("products")
    .select("id, brand, name")
    .eq("status", "active");
  if (brandFilter) query = query.ilike("brand", brandFilter);
  const { data: productsRaw, error } = await query;
  if (error) {
    console.error(`Product fetch error: ${error.message}`);
    process.exit(1);
  }
  const products = (productsRaw ?? []) as unknown as ProductRow[];
  console.log(`Scanning ${products.length} products`);

  // 2. Prime the NSF registry once. This is the big (~2 MB) HTTP call.
  console.log(`Loading NSF Sport registry...`);
  const t0 = Date.now();
  const listings = await nsfSportScraper.loadRegistry();
  console.log(`Loaded ${listings.length} NSF listings in ${Date.now() - t0}ms`);

  // 3. Match each product and upsert.
  let matchedProducts = 0;
  let rowsWritten = 0;
  let rowsSkipped = 0;
  let errors = 0;
  const matchedBrands = new Set<string>();

  for (const p of products) {
    const matches = await nsfSportScraper.findMatches(p.brand, p.name);
    if (matches.length === 0) continue;

    matchedProducts += 1;
    matchedBrands.add(p.brand);
    const top = matches[0];

    // Check if this cert already exists for this product (idempotency).
    const { data: existing } = await sb
      .from("certifications")
      .select("id")
      .eq("product_id", p.id)
      .eq("type", "nsf_sport")
      .maybeSingle();

    if (existing) {
      rowsSkipped += 1;
      continue;
    }

    console.log(`  match: ${p.brand} · ${p.name} -> '${top.productName}' (listing ${top.listingId ?? "—"})`);

    if (dryRun) {
      rowsWritten += 1;
      continue;
    }

    const { error: insertErr } = await sb.from("certifications").insert({
      product_id: p.id,
      type: "nsf_sport",
      verified: true,
      verification_url: top.detailUrl,
      certificate_number: top.listingId ?? null,
      issued_date: null,
      expiration_date: null,
      verified_at: new Date().toISOString(),
      notes: `Auto-seeded via NSF Sport registry match (${matches.length} listing${matches.length === 1 ? "" : "s"})`,
    });

    if (insertErr) {
      console.error(`    ERROR writing cert for ${p.id}: ${insertErr.message}`);
      errors += 1;
      continue;
    }
    rowsWritten += 1;
  }

  console.log(`\n─── Summary ───`);
  console.log(`Products scanned:    ${products.length}`);
  console.log(`Products with NSF:   ${matchedProducts}`);
  console.log(`Distinct brands:     ${matchedBrands.size}  (${[...matchedBrands].slice(0, 5).join(", ")}${matchedBrands.size > 5 ? "..." : ""})`);
  console.log(`Cert rows written:   ${rowsWritten}`);
  console.log(`Cert rows skipped:   ${rowsSkipped}  (already existed)`);
  console.log(`Errors:              ${errors}`);
  console.log(`Mode:                ${dryRun ? "DRY RUN — no writes" : "LIVE — writes committed"}`);
  if (dryRun && rowsWritten > 0) console.log(`\nRun without --dry-run to apply.`);
}

main().catch((err) => {
  console.error("[seed-nsf] FATAL", err);
  process.exit(1);
});
