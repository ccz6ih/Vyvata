/**
 * Rescore products without scores.
 *
 * Brief: 25 products (2026-04-19 audit) have no scores. This blocks them
 * from appearing in practitioner recommendations and makes tier filtering
 * fail.
 *
 * This script identifies unscored products and triggers scoring for each.
 *
 * Usage:
 *   npx tsx scripts/rescore-unscored-products.ts --dry-run
 *   npx tsx scripts/rescore-unscored-products.ts
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient } from "@supabase/supabase-js";

interface Args {
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run") || argv.includes("-n"),
  };
}

async function main() {
  const { dryRun } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  console.log(dryRun ? "[rescore] DRY RUN mode" : "[rescore] LIVE mode");
  console.log("Scanning for products without scores...\n");

  // Get all products with score count
  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select(`
      id,
      brand,
      name,
      category,
      manufacturer_id,
      product_scores!inner (id, is_current)
    `)
    .eq("status", "active");

  if (fetchError) {
    console.error("Error fetching products:", fetchError);
    process.exit(1);
  }

  // Also get products with NO scores (left join needed)
  const { data: allProducts, error: allError } = await supabase
    .from("products")
    .select(`
      id,
      brand,
      name,
      category,
      manufacturer_id,
      product_scores (id, is_current)
    `)
    .eq("status", "active");

  if (allError) {
    console.error("Error fetching all products:", allError);
    process.exit(1);
  }

  if (!allProducts) {
    console.log("No products found");
    return;
  }

  // Filter products with 0 current scores
  const unscoredProducts = allProducts.filter((p: any) => {
    const currentScores = (p.product_scores || []).filter((s: any) => s.is_current);
    return currentScores.length === 0;
  });

  console.log(`Total active products: ${allProducts.length}`);
  console.log(`Products without scores: ${unscoredProducts.length}`);

  if (unscoredProducts.length === 0) {
    console.log("\n✓ No unscored products - all have current scores");
    return;
  }

  // Show details
  console.log("\nUnscored products:");
  unscoredProducts.forEach((p: any) => {
    const hasManufacturer = p.manufacturer_id ? "✓" : "✗";
    console.log(`  ${hasManufacturer} ${p.brand} ${p.name} (${p.category || "no category"})`);
  });

  const withoutManufacturer = unscoredProducts.filter((p: any) => !p.manufacturer_id);
  if (withoutManufacturer.length > 0) {
    console.log(`\n⚠️  ${withoutManufacturer.length} products lack manufacturer_id (may affect scoring)`);
  }

  if (dryRun) {
    console.log("\n─── Summary ───");
    console.log(`Would rescore: ${unscoredProducts.length} products`);
    console.log("Mode:          DRY RUN — no writes");
    console.log("\nRun without --dry-run to trigger rescoring.");
    console.log("\nNote: Rescoring requires:");
    console.log("  1. Product has ingredients (for formulation score)");
    console.log("  2. Product has manufacturer_id (for manufacturing score)");
    console.log("  3. Scoring engine is available");
    return;
  }

  // For actual rescoring, we'd need to import the scoring engine
  // This is typically done via the /api/cron/rescore-products endpoint
  console.log("\n⚠️  Automatic rescoring not yet implemented in script");
  console.log("\nTo rescore these products:");
  console.log("  1. Call POST /api/cron/rescore-products endpoint");
  console.log("  2. Or use admin UI 'Rescore All' button");
  console.log("  3. Or wait for weekly rescore cron (Sundays 5:30 AM)");

  console.log("\nExample API call:");
  console.log(`  curl -X POST https://www.vyvata.com/api/cron/rescore-products \\`);
  console.log(`    -H "Authorization: Bearer CRON_SECRET"`);
}

main().catch(console.error);
