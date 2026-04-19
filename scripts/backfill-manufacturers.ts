/**
 * Brief 03 Step A — Manufacturer backfill.
 *
 * 206 of 207 active products currently have `manufacturer_id IS NULL`
 * (audit 2026-04-19). This blocks the entire compliance pipeline on
 * those products — FDA warning-letter matching runs against
 * manufacturer, so a product with no link never receives a flag even
 * when the brand has active enforcement.
 *
 * This script:
 *   1. SELECTs every product with manufacturer_id NULL
 *   2. Groups by brand (case-insensitive)
 *   3. Per brand: looks up an existing manufacturers row by name, or
 *      creates a minimal one (name only; gmp/fda/3p_tested default to
 *      false so scoreManufacturing() returns the honest 0, not the
 *      hardcoded 50 fallback it uses when manufacturer is null)
 *   4. Links every product of that brand to the manufacturer row
 *
 * Usage:
 *   npx tsx scripts/backfill-manufacturers.ts --dry-run   # preview
 *   npx tsx scripts/backfill-manufacturers.ts              # commit
 *
 * Idempotent: running twice produces no changes on the second run.
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface Args {
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run") || argv.includes("-n"),
  };
}

interface ProductRow {
  id: string;
  brand: string;
  manufacturer_id: string | null;
}

interface ManufacturerRow {
  id: string;
  name: string;
}

// Normalize a brand for manufacturer-name matching. Lowercase, strip
// trademark glyphs and corporate suffixes so "Thorne Research®" matches
// "Thorne" matches "thorne".
function normBrand(s: string): string {
  return s
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/,?\s+(inc|llc|ltd|co|corp|research|labs|nutrition)\.?$/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findOrCreateManufacturer(
  supabase: SupabaseClient,
  brand: string,
  dryRun: boolean
): Promise<{ id: string; created: boolean; name: string } | null> {
  const { data: existing } = await supabase
    .from("manufacturers")
    .select("id, name")
    .ilike("name", brand)
    .limit(1);

  if (existing && existing.length > 0) {
    const m = existing[0] as ManufacturerRow;
    return { id: m.id, created: false, name: m.name };
  }

  // Try fuzzy: normalized-brand contains/is-contained-by normalized-existing
  const { data: all } = await supabase
    .from("manufacturers")
    .select("id, name");
  const target = normBrand(brand);
  for (const m of ((all ?? []) as ManufacturerRow[])) {
    const n = normBrand(m.name);
    if (!n || !target) continue;
    if (n === target || n.includes(target) || target.includes(n)) {
      return { id: m.id, created: false, name: m.name };
    }
  }

  if (dryRun) {
    return { id: "(new)", created: true, name: brand };
  }

  const { data: inserted, error } = await supabase
    .from("manufacturers")
    .insert({
      name: brand,
      gmp_certified: false,
      fda_registered: false,
      third_party_tested: false,
    })
    .select("id, name")
    .single();

  if (error || !inserted) {
    console.error(`  ERROR creating manufacturer '${brand}': ${error?.message}`);
    return null;
  }
  const row = inserted as ManufacturerRow;
  return { id: row.id, created: true, name: row.name };
}

async function main() {
  const { dryRun } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log(`[backfill-manufacturers] ${dryRun ? "DRY RUN" : "LIVE"} mode`);

  const { data: productsRaw, error } = await sb
    .from("products")
    .select("id, brand, manufacturer_id")
    .eq("status", "active")
    .is("manufacturer_id", null);

  if (error) {
    console.error(`Fetch error: ${error.message}`);
    process.exit(1);
  }
  const products = (productsRaw ?? []) as unknown as ProductRow[];
  console.log(`Found ${products.length} products with NULL manufacturer_id`);

  // Group by brand (case-insensitive)
  const byBrand = new Map<string, ProductRow[]>();
  for (const p of products) {
    const key = p.brand.toLowerCase().trim();
    const arr = byBrand.get(key) ?? [];
    arr.push(p);
    byBrand.set(key, arr);
  }
  console.log(`${byBrand.size} distinct brands\n`);

  let linked = 0;
  let mfrsCreated = 0;
  let mfrsReused = 0;
  let errors = 0;

  for (const [, rows] of byBrand) {
    const brand = rows[0].brand;
    const mfr = await findOrCreateManufacturer(sb, brand, dryRun);
    if (!mfr) {
      errors += 1;
      continue;
    }
    if (mfr.created) mfrsCreated += 1;
    else mfrsReused += 1;

    const verb = mfr.created ? "created" : "reused";
    console.log(`[${verb}] ${brand} -> manufacturers.${mfr.id.slice(0, 8)}... '${mfr.name}' (${rows.length} product${rows.length === 1 ? "" : "s"})`);

    if (dryRun || mfr.id === "(new)") {
      linked += rows.length;
      continue;
    }

    const { error: updateErr } = await sb
      .from("products")
      .update({ manufacturer_id: mfr.id })
      .in("id", rows.map((r) => r.id));
    if (updateErr) {
      console.error(`  ERROR linking products for ${brand}: ${updateErr.message}`);
      errors += 1;
      continue;
    }
    linked += rows.length;
  }

  console.log(`\n─── Summary ───`);
  console.log(`Products linked:      ${linked}`);
  console.log(`Manufacturers created: ${mfrsCreated}`);
  console.log(`Manufacturers reused:  ${mfrsReused}`);
  console.log(`Errors:                ${errors}`);
  console.log(`Mode:                  ${dryRun ? "DRY RUN — no writes" : "LIVE — writes committed"}`);
  if (dryRun && linked > 0) {
    console.log(`\nRun without --dry-run to apply.`);
  }
}

main().catch((err) => {
  console.error("[backfill-manufacturers] FATAL", err);
  process.exit(1);
});
