/**
 * Cleanup products without ingredients.
 *
 * Brief: 276 products (2026-04-19 audit) have no ingredients. This blocks
 * formulation scoring and makes them invisible in practitioner searches
 * that filter by ingredient.
 *
 * This script deletes those products so they can be re-imported from DSLD
 * with proper ingredient data via the quick-import or full import-products
 * cron.
 *
 * Usage:
 *   npx tsx scripts/cleanup-empty-products.ts --dry-run
 *   npx tsx scripts/cleanup-empty-products.ts
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

  console.log(dryRun ? "[cleanup] DRY RUN mode" : "[cleanup] LIVE mode");
  console.log("Scanning for products without ingredients...\n");

  // Get all products with ingredient count
  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select(`
      id,
      brand,
      name,
      category,
      dsld_id,
      product_ingredients (id)
    `);

  if (fetchError) {
    console.error("Error fetching products:", fetchError);
    process.exit(1);
  }

  if (!products) {
    console.log("No products found");
    return;
  }

  // Filter products with 0 ingredients
  const emptyProducts = products.filter(
    (p) => !p.product_ingredients || p.product_ingredients.length === 0
  );

  console.log(`Total products: ${products.length}`);
  console.log(`Products without ingredients: ${emptyProducts.length}`);

  if (emptyProducts.length === 0) {
    console.log("\n✓ No cleanup needed - all products have ingredients");
    return;
  }

  // Group by category for reporting
  const byCategory = emptyProducts.reduce((acc, p) => {
    const cat = p.category || "unknown";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nProducts without ingredients by category:");
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  // Show sample products
  console.log("\nSample products to delete:");
  emptyProducts.slice(0, 10).forEach((p) => {
    console.log(`  - ${p.brand} ${p.name} (${p.category})`);
  });

  if (emptyProducts.length > 10) {
    console.log(`  ... and ${emptyProducts.length - 10} more`);
  }

  if (dryRun) {
    console.log("\n─── Summary ───");
    console.log(`Would delete: ${emptyProducts.length} products`);
    console.log(`Would remain: ${products.length - emptyProducts.length} products`);
    console.log("Mode:         DRY RUN — no writes");
    console.log("\nRun without --dry-run to apply.");
    return;
  }

  // Execute deletion
  console.log("\n🗑️  Deleting products...");

  const productIds = emptyProducts.map((p) => p.id);
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .in("id", productIds);

  if (deleteError) {
    console.error("\n❌ Error deleting products:", deleteError);
    process.exit(1);
  }

  // Verify
  const { count: remainingCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  console.log("\n─── Summary ───");
  console.log(`Deleted:  ${emptyProducts.length} products`);
  console.log(`Remaining: ${remainingCount} products`);
  console.log("Mode:      LIVE — writes committed");
  console.log("\n✅ Cleanup complete!");
  console.log("\nNext steps:");
  console.log("  1. Run quick-import to re-populate with proper ingredients");
  console.log("  2. Or wait for daily import-products cron");
}

main().catch(console.error);
