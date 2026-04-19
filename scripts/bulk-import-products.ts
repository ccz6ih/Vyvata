/**
 * Bulk import products from DSLD
 *
 * Directly imports products from DSLD API into database, cycling through
 * all categories to maximize variety. Runs until target is reached or
 * database is saturated.
 *
 * Usage:
 *   npx tsx scripts/bulk-import-products.ts --target 1000
 *   npx tsx scripts/bulk-import-products.ts --target 500 --batch 30
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient } from "@supabase/supabase-js";
import { searchDSLD, getDSLDProductById, type DSLDProduct } from "../src/lib/dsld-api";

interface Args {
  target: number;
  batchSize: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] ?? null : null;
  };
  return {
    target: get("--target") ? parseInt(get("--target")!, 10) : 1000,
    batchSize: get("--batch") ? parseInt(get("--batch")!, 10) : 50,
  };
}

const CATEGORIES = [
  { name: 'magnesium', search: 'magnesium' },
  { name: 'vitamin-d', search: 'vitamin d' },
  { name: 'omega-3', search: 'fish oil' },
  { name: 'b-complex', search: 'b complex' },
  { name: 'probiotic', search: 'probiotic' },
  { name: 'zinc', search: 'zinc' },
  { name: 'vitamin-c', search: 'vitamin c' },
  { name: 'curcumin', search: 'curcumin' },
  { name: 'coq10', search: 'coq10' },
  { name: 'multivitamin', search: 'multivitamin' },
  { name: 'collagen', search: 'collagen' },
  { name: 'ashwagandha', search: 'ashwagandha' },
  { name: 'iron', search: 'iron' },
  { name: 'calcium', search: 'calcium' },
  { name: 'vitamin-k', search: 'vitamin k2' },
  { name: 'biotin', search: 'biotin' },
  { name: 'folate', search: 'methylfolate' },
  { name: 'vitamin-b12', search: 'vitamin b12' },
  { name: 'vitamin-e', search: 'vitamin e' },
  { name: 'selenium', search: 'selenium' },
  { name: 'chromium', search: 'chromium' },
  { name: 'rhodiola', search: 'rhodiola' },
  { name: 'ginkgo', search: 'ginkgo biloba' },
  { name: 'milk-thistle', search: 'milk thistle' },
];

const PREFERRED_BRANDS = [
  'Thorne', 'Life Extension', 'Pure Encapsulations', 'NOW Foods',
  'Jarrow Formulas', 'Nordic Naturals', 'Doctor\'s Best', 'Garden of Life',
  'Solgar', 'Nature\'s Way', 'Vital Proteins', 'Ancient Nutrition',
  'Bluebonnet', 'Designs for Health', 'Integrative Therapeutics'
];

type Bioavailability = 'HIGH' | 'MEDIUM' | 'LOW';

function inferBioavailability(form: string): Bioavailability {
  const formLower = form.toLowerCase();
  if (formLower.includes('bisglycinate') || formLower.includes('glycinate') ||
      formLower.includes('citrate') || formLower.includes('malate') ||
      formLower.includes('d3') || formLower.includes('methylcobalamin') ||
      formLower.includes('ubiquinol')) {
    return 'HIGH';
  }
  if (formLower.includes('oxide') || formLower.includes('carbonate') ||
      formLower.includes('cyanocobalamin')) {
    return 'LOW';
  }
  return 'MEDIUM';
}

async function importCategoryBatch(
  supabase: any,
  category: typeof CATEGORIES[0],
  batchSize: number
): Promise<{ imported: number; skipped: number; errors: number }> {
  
  console.log(`🔍 Searching: ${category.search} (${category.name})`);
  
  const searchResult = await searchDSLD(category.search);
  const results = searchResult.products || [];
  
  console.log(`   Found ${results.length} DSLD results`);
  
  // Sort by preferred brands
  const sorted = results.sort((a, b) => {
    const aPreferred = PREFERRED_BRANDS.includes(a.brandName || '');
    const bPreferred = PREFERRED_BRANDS.includes(b.brandName || '');
    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    return 0;
  });
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  const maxToCheck = Math.min(sorted.length, 200);
  
  for (let i = 0; i < maxToCheck && imported < batchSize; i++) {
    const item = sorted[i];
    
    if (!item.id || !item.brandName || !item.fullName) {
      continue;
    }
    
    // Check for duplicate
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('brand', item.brandName)
      .eq('name', item.fullName)
      .single();
    
    if (existing) {
      skipped++;
      if (skipped % 20 === 0) {
        console.log(`   ... skipped ${skipped} duplicates`);
      }
      continue;
    }
    
    // Fetch full details
    await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit
    const fullProduct = await getDSLDProductById(item.id.toString());
    
    if (!fullProduct || !fullProduct.ingredientRows || fullProduct.ingredientRows.length === 0) {
      errors++;
      continue;
    }
    
    try {
      // Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          brand: fullProduct.brandName,
          name: fullProduct.fullName,
          category: category.name,
          dsld_id: fullProduct.id?.toString(),
          serving_size: fullProduct.servingSize,
          servings_per_container: fullProduct.servingsPerContainer 
            ? Math.round(parseFloat(fullProduct.servingsPerContainer.toString()))
            : null,
          status: 'active',
        })
        .select()
        .single();
      
      if (productError) {
        console.log(`  ❌ ${fullProduct.brandName} ${fullProduct.fullName}: ${productError.message}`);
        errors++;
        continue;
      }
      
      // Insert ingredients
      const ingredients = fullProduct.ingredientRows.map((ing: any) => ({
        product_id: newProduct.id,
        name: ing.name || ing.ingredientName,
        amount: ing.quantityPerServing,
        unit: ing.unit,
        daily_value_percent: ing.dailyValuePercent,
        form: ing.form,
        bioavailability: ing.form ? inferBioavailability(ing.form) : 'MEDIUM',
      }));
      
      const { error: ingredientsError } = await supabase
        .from('product_ingredients')
        .insert(ingredients);
      
      if (ingredientsError) {
        // Rollback product
        await supabase.from('products').delete().eq('id', newProduct.id);
        errors++;
        continue;
      }
      
      imported++;
      console.log(`  ✓ ${fullProduct.brandName} ${fullProduct.fullName} (${ingredients.length} ingredients)`);
      
    } catch (err) {
      console.log(`  ❌ Error:`, err);
      errors++;
    }
  }
  
  return { imported, skipped, errors };
}

async function main() {
  const { target, batchSize } = parseArgs();
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  
  console.log(`🚀 Bulk Import Target: ${target} products`);
  console.log(`   Batch size: ${batchSize} per category\n`);
  
  const startTime = Date.now();
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let categoryIndex = 0;
  let consecutiveEmpty = 0;
  
  // Get starting count
  const { count: startCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Starting with ${startCount} products\n`);
  
  while (true) {
    // Get current count
    const { count: currentCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (currentCount && currentCount >= target) {
      console.log(`\n🎉 Target reached! ${currentCount} products`);
      break;
    }
    
    // Cycle through categories
    const category = CATEGORIES[categoryIndex % CATEGORIES.length];
    categoryIndex++;
    
    console.log(`\n[Batch ${categoryIndex}] Category: ${category.name}`);
    console.log(`Current total: ${currentCount}/${target}`);
    
    const result = await importCategoryBatch(supabase, category, batchSize);
    totalImported += result.imported;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
    
    console.log(`  Result: +${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`);
    
    if (result.imported === 0) {
      consecutiveEmpty++;
      console.log(`  ⚠️ No new products (${consecutiveEmpty} consecutive)`);
      
      if (consecutiveEmpty >= 10) {
        console.log(`\n⚠️ Stopping: 10 consecutive batches with no new products`);
        console.log(`   Database may be saturated with available DSLD products`);
        break;
      }
    } else {
      consecutiveEmpty = 0;
    }
    
    // Progress
    const progress = currentCount ? Math.round((currentCount / target) * 100) : 0;
    console.log(`  📊 Progress: ${currentCount}/${target} (${progress}%)`);
    
    // Safety limit
    if (categoryIndex >= 100) {
      console.log(`\n⚠️ Stopping: Reached 100 batch limit`);
      break;
    }
  }
  
  const { count: endCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log(`\n═══ Summary ═══`);
  console.log(`Batches run:      ${categoryIndex}`);
  console.log(`Products added:   ${(endCount || 0) - (startCount || 0)}`);
  console.log(`Total imported:   ${totalImported}`);
  console.log(`Total skipped:    ${totalSkipped}`);
  console.log(`Total errors:     ${totalErrors}`);
  console.log(`Final count:      ${endCount}`);
  console.log(`Time elapsed:     ${elapsed} min`);
  
  if (endCount && endCount >= target) {
    console.log(`\n✅ Success! Reached target of ${target} products`);
  } else {
    console.log(`\n⚠️ Stopped at ${endCount}/${target} products`);
  }
}

main().catch(console.error);
