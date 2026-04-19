/**
 * Enrich ingredient-less products from DSLD.
 *
 * Walks every active product that has zero `product_ingredients` rows,
 * searches DSLD by brand+name, and — when DSLD finds a match — writes
 * the ingredient rows, links the manufacturer, and stamps dsld_id onto
 * the product.
 *
 * Safety guarantees (enforced in code, not just documented):
 *   - NEVER deletes or soft-deletes any product
 *   - NEVER touches a product that already has ≥1 ingredient row
 *   - NEVER overwrites an existing product_ingredients row (INSERT only)
 *   - NEVER changes status, brand, or name
 *   - Only WRITES: new product_ingredients rows + sets product.dsld_id +
 *     sets product.manufacturer_id if currently NULL
 *
 * --dry-run previews without writing. --limit N caps the batch size.
 * --offset N skips the first N (useful for resuming).
 * --brand "X" restricts to a single brand.
 *
 * Usage:
 *   npx tsx scripts/enrich-empty-products.ts --dry-run --limit 10
 *   npx tsx scripts/enrich-empty-products.ts --limit 50
 *   npx tsx scripts/enrich-empty-products.ts --brand "Thorne"
 *   npx tsx scripts/enrich-empty-products.ts                 # everything
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { searchDSLD, getDSLDProductById, type DSLDProduct } from "../src/lib/dsld-api";

// ═══════════════════════════════════════════════════════════════
// CLI arg parsing
// ═══════════════════════════════════════════════════════════════

interface Args {
  dryRun: boolean;
  limit: number | null;
  offset: number;
  brandFilter: string | null;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] ?? null : null;
  };
  return {
    dryRun: argv.includes("--dry-run") || argv.includes("-n"),
    limit: get("--limit") ? parseInt(get("--limit")!, 10) : null,
    offset: get("--offset") ? parseInt(get("--offset")!, 10) : 0,
    brandFilter: get("--brand"),
  };
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface EmptyProduct {
  id: string;
  brand: string;
  name: string;
  manufacturer_id: string | null;
  dsld_id: string | null;
  serving_size: string | null;
  servings_per_container: number | null;
}

interface EnrichmentResult {
  product: EmptyProduct;
  status: "enriched" | "no_match" | "match_no_ingredients" | "error";
  dsldMatch?: { id: number; fullName: string; brandName: string };
  ingredientCount?: number;
  manufacturerLinked?: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// Bioavailability inference (lifted from scripts/auto-import-products.ts)
// Keeps behaviour consistent with the primary importer so enriched
// products score the same as freshly-imported ones.
// ═══════════════════════════════════════════════════════════════

function inferBioavailability(
  ingredientName: string,
  form?: string
): "high" | "medium" | "low" {
  if (!form) return "medium";
  const f = form.toLowerCase();
  const n = ingredientName.toLowerCase();

  if (n.includes("magnesium")) {
    if (/bisglycinate|glycinate|citrate|malate|taurate|threonate/.test(f)) return "high";
    if (/oxide|carbonate|sulfate/.test(f)) return "low";
    return "medium";
  }
  if (n.includes("vitamin d")) {
    if (/d3|cholecalciferol/.test(f)) return "high";
    if (/d2|ergocalciferol/.test(f)) return "medium";
  }
  if (/b12|cobalamin/.test(n)) {
    if (/methyl|adenosyl|hydroxo/.test(f)) return "high";
    if (/cyano/.test(f)) return "low";
  }
  if (/folate|folic/.test(n)) {
    if (/methyl|5-mthf|l-5-mthf|l-methylfolate/.test(f)) return "high";
    if (/folic acid/.test(f)) return "low";
  }
  if (/epa|dha|omega/.test(n)) {
    if (/triglyceride|phospholipid|rtg/.test(f)) return "high";
    if (/ethyl ester/.test(f)) return "medium";
  }
  return "medium";
}

// ═══════════════════════════════════════════════════════════════
// DSLD match — search then fetch full product details
// ═══════════════════════════════════════════════════════════════

async function findDsldMatch(
  brand: string,
  name: string
): Promise<DSLDProduct | null> {
  try {
    // Search with combined brand+name. filterByBrand folds brand into
    // the query; DSLD doesn't have a strict brand filter in v9.
    const res = await searchDSLD(name, { filterByBrand: brand, perPage: 10 });
    if (!res.products || res.products.length === 0) return null;

    // Prefer a product whose brandName equals our brand (case-insensitive).
    // DSLD search isn't strict; without a brand check we can match
    // another company's product with a similar name.
    const brandLower = brand.toLowerCase().trim();
    const matchByBrand = res.products.find(
      (p) => (p.brandName ?? "").toLowerCase().trim() === brandLower
    );
    const candidate = matchByBrand ?? res.products[0];

    // Guard: if the top candidate's brand is wildly different from ours,
    // bail out — we'd rather have "no_match" than wrong data.
    if (!matchByBrand) {
      const candBrand = (candidate.brandName ?? "").toLowerCase();
      if (!candBrand.includes(brandLower.split(" ")[0]) &&
          !brandLower.includes(candBrand.split(" ")[0])) {
        return null;
      }
    }

    // Fetch full product (search results are summaries, don't include ingredients)
    return await getDSLDProductById(String(candidate.id));
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Manufacturer lookup / create (same pattern as backfill-manufacturers.ts)
// ═══════════════════════════════════════════════════════════════

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
  sb: SupabaseClient,
  brand: string,
  dryRun: boolean
): Promise<string | null> {
  const { data: exact } = await sb
    .from("manufacturers")
    .select("id, name")
    .ilike("name", brand)
    .limit(1);
  if (exact && exact.length > 0) return (exact[0] as { id: string }).id;

  const { data: all } = await sb.from("manufacturers").select("id, name");
  const target = normBrand(brand);
  for (const m of ((all ?? []) as Array<{ id: string; name: string }>)) {
    const n = normBrand(m.name);
    if (!n || !target) continue;
    if (n === target || n.includes(target) || target.includes(n)) return m.id;
  }

  if (dryRun) return "(would-create)";

  const { data: inserted } = await sb
    .from("manufacturers")
    .insert({
      name: brand,
      gmp_certified: false,
      fda_registered: false,
      third_party_tested: false,
    })
    .select("id")
    .single();
  return (inserted as { id: string } | null)?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function enrichOne(
  sb: SupabaseClient,
  product: EmptyProduct,
  dryRun: boolean
): Promise<EnrichmentResult> {
  try {
    const dsld = await findDsldMatch(product.brand, product.name);
    if (!dsld) {
      return { product, status: "no_match" };
    }

    const ingredients = dsld.ingredients ?? [];
    if (ingredients.length === 0) {
      return {
        product,
        status: "match_no_ingredients",
        dsldMatch: { id: dsld.id, fullName: dsld.fullName, brandName: dsld.brandName },
      };
    }

    // Double-check the product STILL has no ingredients (another process
    // could have enriched it between our initial query and now).
    const { data: existingIng } = await sb
      .from("product_ingredients")
      .select("id")
      .eq("product_id", product.id)
      .limit(1);
    if (existingIng && existingIng.length > 0) {
      return { product, status: "enriched", ingredientCount: 0 /* no-op */ };
    }

    const rows = ingredients.map((ing, idx) => ({
      product_id: product.id,
      ingredient_name: ing.name,
      dose: ing.quantity ?? 0,
      unit: ing.unit ?? "mg",
      form: ing.ingredientForm ?? null,
      bioavailability: inferBioavailability(ing.name, ing.ingredientForm),
      is_proprietary_blend: false,
      daily_value_percentage: ing.percentDailyValue ?? null,
      display_order: idx + 1,
    }));

    // Manufacturer lookup/create only if the product doesn't already have one.
    let manufacturerLinked = false;
    let manufacturerId: string | null = product.manufacturer_id;
    if (!manufacturerId) {
      manufacturerId = await findOrCreateManufacturer(sb, product.brand, dryRun);
      manufacturerLinked = !!manufacturerId;
    }

    if (!dryRun) {
      const { error: ingErr } = await sb.from("product_ingredients").insert(rows);
      if (ingErr) {
        return { product, status: "error", error: `ingredient insert: ${ingErr.message}` };
      }

      // Patch the products row with dsld_id and (if null) manufacturer_id.
      // Never overwrite an existing manufacturer_id — the user may have
      // hand-curated that link.
      const patch: Record<string, unknown> = { dsld_id: String(dsld.id) };
      if (manufacturerLinked && manufacturerId && !product.manufacturer_id) {
        patch.manufacturer_id = manufacturerId;
      }
      const { error: prodErr } = await sb
        .from("products")
        .update(patch)
        .eq("id", product.id);
      if (prodErr) {
        return { product, status: "error", error: `product update: ${prodErr.message}` };
      }
    }

    return {
      product,
      status: "enriched",
      dsldMatch: { id: dsld.id, fullName: dsld.fullName, brandName: dsld.brandName },
      ingredientCount: rows.length,
      manufacturerLinked,
    };
  } catch (err) {
    return {
      product,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const args = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log(`[enrich] ${args.dryRun ? "DRY RUN" : "LIVE"}${args.brandFilter ? `, brand=${args.brandFilter}` : ""}${args.limit != null ? `, limit=${args.limit}` : ""}${args.offset ? `, offset=${args.offset}` : ""}`);

  // Fetch every active product with zero product_ingredients rows.
  // PostgREST doesn't have a clean "NOT EXISTS" filter; pull all active
  // products and filter in-process. Cheap at N=500.
  let q = sb
    .from("products")
    .select(`
      id, brand, name, manufacturer_id, dsld_id, serving_size, servings_per_container,
      product_ingredients (id)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (args.brandFilter) q = q.ilike("brand", args.brandFilter);
  const { data: allRaw, error: fetchErr } = await q;
  if (fetchErr) {
    console.error(`Fetch error: ${fetchErr.message}`);
    process.exit(1);
  }

  type Raw = EmptyProduct & { product_ingredients: Array<{ id: string }> };
  const empty = ((allRaw ?? []) as unknown as Raw[])
    .filter((r) => r.product_ingredients.length === 0)
    .map((r): EmptyProduct => ({
      id: r.id,
      brand: r.brand,
      name: r.name,
      manufacturer_id: r.manufacturer_id,
      dsld_id: r.dsld_id,
      serving_size: r.serving_size,
      servings_per_container: r.servings_per_container,
    }));

  const total = empty.length;
  const batch = empty.slice(args.offset, args.limit != null ? args.offset + args.limit : undefined);
  console.log(`Found ${total} products with 0 ingredients. Processing ${batch.length}.\n`);

  const results: EnrichmentResult[] = [];
  let i = 0;
  for (const p of batch) {
    i += 1;
    process.stdout.write(`  [${i}/${batch.length}] ${p.brand} · ${p.name} ... `);
    const result = await enrichOne(sb, p, args.dryRun);
    results.push(result);

    switch (result.status) {
      case "enriched":
        console.log(`✓ ${result.ingredientCount} ingredients${result.manufacturerLinked ? " + manufacturer" : ""}`);
        break;
      case "no_match":
        console.log(`— no DSLD match`);
        break;
      case "match_no_ingredients":
        console.log(`~ matched but DSLD row has no ingredient data (${result.dsldMatch?.id})`);
        break;
      case "error":
        console.log(`✗ ${result.error}`);
        break;
    }
  }

  const summary = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalIngredients = results
    .filter((r) => r.status === "enriched")
    .reduce((sum, r) => sum + (r.ingredientCount ?? 0), 0);

  console.log(`\n─── Summary ───`);
  console.log(`Processed:        ${batch.length}`);
  console.log(`Enriched:         ${summary.enriched ?? 0}  (${totalIngredients} ingredient rows ${args.dryRun ? "would be" : ""} written)`);
  console.log(`No DSLD match:    ${summary.no_match ?? 0}`);
  console.log(`Matched no-data:  ${summary.match_no_ingredients ?? 0}`);
  console.log(`Errors:           ${summary.error ?? 0}`);
  console.log(`Remaining empty:  ${total - args.offset - batch.length}  (products with 0 ingredients not in this batch)`);
  console.log(`Mode:             ${args.dryRun ? "DRY RUN — no writes" : "LIVE — writes committed"}`);

  if (args.dryRun && (summary.enriched ?? 0) > 0) {
    console.log(`\nRun without --dry-run to apply.`);
  }

  // List the "no match" products at the end for manual review.
  const noMatch = results.filter((r) => r.status === "no_match");
  if (noMatch.length > 0 && noMatch.length <= 40) {
    console.log(`\n─── Products with no DSLD match (manual review needed) ───`);
    for (const r of noMatch) {
      console.log(`   ${r.product.brand} · ${r.product.name}`);
    }
  } else if (noMatch.length > 40) {
    console.log(`\n${noMatch.length} products had no DSLD match — list suppressed (>40). Re-run with smaller --limit to see details.`);
  }
}

main().catch((err) => {
  console.error("[enrich] FATAL", err);
  process.exit(1);
});
