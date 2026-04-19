/**
 * Import supplement products from USDA FoodData Central API
 *
 * Uses the USDA FoodData Central database which has 235K+ supplement
 * products with full ingredient lists. Much better data quality than DSLD.
 *
 * Usage:
 *   npx tsx scripts/usda-import-products.ts --target 1000
 *   npx tsx scripts/usda-import-products.ts --target 500 --batch 50
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
  { name: 'omega-3', search: 'fish oil omega 3 softgel' },
  { name: 'vitamin-d', search: 'vitamin d3 cholecalciferol' },
  { name: 'magnesium', search: 'magnesium glycinate citrate' },
  { name: 'probiotic', search: 'probiotic lactobacillus' },
  { name: 'multivitamin', search: 'multivitamin multimineral' },
  { name: 'vitamin-c', search: 'ascorbic acid vitamin c' },
  { name: 'b-complex', search: 'b complex thiamine riboflavin' },
  { name: 'coq10', search: 'coenzyme q10 ubiquinone' },
  { name: 'curcumin', search: 'curcumin turmeric extract' },
  { name: 'zinc', search: 'zinc picolinate gluconate' },
  { name: 'vitamin-b12', search: 'methylcobalamin cyanocobalamin' },
  { name: 'iron', search: 'ferrous iron bisglycinate' },
  { name: 'calcium', search: 'calcium carbonate citrate' },
  { name: 'collagen', search: 'collagen peptides hydrolyzed' },
  { name: 'ashwagandha', search: 'ashwagandha withanolides' },
  { name: 'biotin', search: 'biotin vitamin b7 h' },
  { name: 'vitamin-e', search: 'tocopherol vitamin e' },
  { name: 'selenium', search: 'selenium selenomethionine' },
  { name: 'vitamin-k', search: 'vitamin k2 menaquinone' },
  { name: 'folate', search: 'methylfolate l-methylfolate' },
];

interface USDAProduct {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  ingredients?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodCategory?: string; // From search endpoint
  brandedFoodCategory?: string; // From full product endpoint
  foodNutrients?: Array<{
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

interface USDASearchResponse {
  totalHits: number;
  foods: USDAProduct[];
}

const FDC_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = process.env.USDA_FDC_API_KEY;
const RATE_LIMIT_MS = 3700; // 1000 requests/hour = 3.6s per request (use 3.7s to be safe)

if (!API_KEY) {
  console.error('❌ USDA_FDC_API_KEY not found in environment variables');
  process.exit(1);
}

async function searchUSDA(query: string, pageSize: number = 50): Promise<USDAProduct[]> {
  const url = `${FDC_API_BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&dataType=Branded&pageSize=${pageSize}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }
  
  const data: USDASearchResponse = await response.json();
  return data.foods || [];
}

async function getUSDAProduct(fdcId: number): Promise<USDAProduct | null> {
  const url = `${FDC_API_BASE}/food/${fdcId}?api_key=${API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Parse ingredients text into individual ingredient records
 * USDA provides ingredients as comma-separated text like:
 * "FISH OIL, GELATIN, GLYCERIN, NATURAL LEMON FLAVOR, TOCOPHEROLS"
 */
function parseIngredients(ingredientsText: string): Array<{ name: string; amount: string | null }> {
  if (!ingredientsText || ingredientsText.trim().length === 0) return [];
  
  // Split on commas and clean up
  const parts = ingredientsText
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return parts.map(name => ({
    name: name,
    amount: null // USDA ingredients are text only, no amounts
  }));
}

/**
 * Infer bioavailability based on ingredient forms
 */
function inferBioavailability(ingredientName: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const lower = ingredientName.toLowerCase();
  
  // High bioavailability forms
  if (lower.includes('bisglycinate') || lower.includes('glycinate') ||
      lower.includes('citrate') || lower.includes('malate') ||
      lower.includes('methylcobalamin') || lower.includes('methylfolate') ||
      lower.includes('ubiquinol') || lower.includes('chelate')) {
    return 'HIGH';
  }
  
  // Low bioavailability forms
  if (lower.includes('oxide') || lower.includes('carbonate') ||
      lower.includes('sulfate') || lower.includes('gluconate')) {
    return 'LOW';
  }
  
  return 'MEDIUM';
}

/**
 * Check if product already exists by brand+name
 */
async function isDuplicate(brand: string, name: string): Promise<boolean> {
  const { data } = await supabase
    .from('products')
    .select('id')
    .ilike('brand', brand)
    .ilike('name', name)
    .maybeSingle();
  
  return !!data;
}

/**
 * Filter out food products (only keep dietary supplements)
 */
function isActualSupplement(product: USDAProduct): boolean {
  const descLower = (product.description || '').toLowerCase();
  // Check both foodCategory (search) and brandedFoodCategory (full product)
  const category = (product.foodCategory || product.brandedFoodCategory || '').toLowerCase();
  const ingLower = (product.ingredients || '').toLowerCase();
  
  // Check foodCategory for supplement keywords
  if (category) {
    const isSupplementCategory = 
      category.includes('supplement') || category.includes('vitamin') ||
      category.includes('mineral') || category.includes('probiotic') ||
      category.includes('fatty acid');
    
    // Exclude obvious food categories
    const isFoodCategory =
      category.includes('milk') || category.includes('dairy') ||
      category.includes('oil') || category.includes('sauce') ||
      category.includes('bread') || category.includes('cereal') ||
      category.includes('beverage') || category.includes('soda') ||
      category.includes('water') || category.includes('coffee') ||
      category.includes('tea');
    
    if (isFoodCategory) return false;
    if (isSupplementCategory) return true;
  }
  
  // Fallback: check description/ingredients for food products
  const isFoodProduct = 
    descLower.includes(' milk') || descLower.includes(' oil') ||
    descLower.includes('spread') || descLower.includes('butter') ||
    descLower.includes('bread') || descLower.includes('cereal') ||
    descLower.includes('trail') || descLower.includes('bar ') ||
    descLower.includes('drink') || descLower.includes('beverage') ||
    descLower.includes('juice') || descLower.includes('salmon') ||
    descLower.includes('tuna') || descLower.includes('coffee') ||
    descLower.includes('espresso') || descLower.includes('cider') ||
    ingLower.includes('arabica') || ingLower.includes('robusta');
  
  if (isFoodProduct) return false;
  
  // Accept if has supplement form OR supplement ingredients
  const hasSupplementForm =
    descLower.includes('softgel') || descLower.includes('soft gel') ||
    descLower.includes('tablet') || descLower.includes('gummy') ||
    descLower.includes('gummies') || descLower.includes('capsule') ||
    descLower.includes('dietary supplement');
  
  const hasSupplementIngredients = 
    ingLower.includes('gelatin') || ingLower.includes('cellulose') ||
    ingLower.includes('hypromellose') || ingLower.includes('magnesium stearate') ||
    ingLower.includes('silicon dioxide') || ingLower.includes('stearic acid') ||
    ingLower.includes('microcrystalline');
  
  // Accept if it looks like a vitamin/mineral supplement
  const hasSupplementNutrients =
    descLower.includes('vitamin') || descLower.includes('mineral') ||
    descLower.includes('omega') || descLower.includes('probiotic') ||
    descLower.includes('collagen') || descLower.includes('protein') ||
    descLower.includes('amino') || descLower.includes('enzyme') ||
    descLower.includes('extract') || descLower.includes('supplement');
  
  return hasSupplementForm || hasSupplementIngredients || hasSupplementNutrients;
}

/**
 * Import a single product to database
 */
async function importProduct(product: USDAProduct, category: string): Promise<boolean> {
  const brand = product.brandName || product.brandOwner || 'Unknown';
  const name = product.description;
  product
  // Skip if no ingredients
  if (!product.ingredients || product.ingredients.trim().length === 0) {
    return false;
  }
  
  // Filter out food products
  if (!isActualSupplement(product)) {
    return false;
  }
  
  // Parse ingredients
  const ingredients = parseIngredients(product.ingredients);
  if (ingredients.length === 0) {
    return false;
  }
  
  // Insert product
  const { data: productData, error: productError } = await supabase
    .from('products')
    .insert({
      brand,
      name,
      category,
      serving_size: product.servingSize || 1,
      servings_per_container: 30, // Default if not specified
      price_per_serving: null,
      manufacturer_id: null, // Will be backfilled later
      product_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${product.fdcId}/nutrients`,
    })
    .select('id')
    .single();
  
  if (productError || !productData) {
    console.error(`   ❌ Failed to insert product: ${productError?.message}`);
    return false;
  }
  
  // Insert ingredients
  for (const ingredient of ingredients) {
    await supabase.from('product_ingredients').insert({
      product_id: productData.id,
      ingredient_name: ingredient.name,
      amount: ingredient.amount,
      unit: null,
      form: ingredient.name, // Use full name as form
      bioavailability: inferBioavailability(ingredient.name),
    });
  }
  
  return true;
}

/**
 * Import one batch for a category
 */
async function importCategoryBatch(
  category: { name: string; search: string },
  batchSize: number,
  batchNum: number
): Promise<{ imported: number; skipped: number; errors: number }> {
  console.log(`\n[Batch ${batchNum}] Category: ${category.name}`);
  
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`Current total: ${count}/target`);
  
  console.log(`🔍 Searching USDA FDC: ${category.search}`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  try {
    // Search USDA (returns up to 50 results by default)
    const products = await searchUSDA(category.search, 200);
    console.log(`   Found ${products.length} USDA products`);
    
    if (products.length === 0) {
      console.log(`   ⚠️ No products found for ${category.search}`);
      return { imported, skipped, errors };
    }
    
    // Try to import up to batchSize non-duplicate products
    let checked = 0;
    for (const product of products) {
      if (imported >= batchSize) break;
      
      checked++;
      if (checked % 10 === 0) {
        console.log(`   ... checked ${checked}/${products.length}, imported ${imported}/${batchSize}, skipped ${skipped}`);
      }
      
      const brand = product.brandName || product.brandOwner || 'Unknown';
      
      // Check if duplicate
      if (await isDuplicate(brand, product.description)) {
        skipped++;
        continue;
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      
      // Fetch full details (USDA search returns basic info)
      const fullProduct = await getUSDAProduct(product.fdcId);
      if (!fullProduct) {
        errors++;
        continue;
      }
      
      // Import product
      const success = await importProduct(fullProduct, category.name);
      if (success) {
        imported++;
        console.log(`   ✅ Imported: ${brand} - ${fullProduct.description.substring(0, 60)}`);
      } else {
        errors++;
      }
    }
    
    console.log(`  Result: +${imported} imported, ${skipped} duplicates, ${errors} errors`);
    
  } catch (error) {
    console.error(`  ❌ Error in batch: ${error}`);
    errors++;
  }
  
  return { imported, skipped, errors };
}

/**
 * Main import loop
 */
async function main() {
  const args = parseArgs();
  
  console.log(`🚀 USDA FoodData Central Import`);
  console.log(`   Target: ${args.target} products`);
  console.log(`   Batch size: ${args.batchSize} per category\n`);
  
  const { count: startCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`📊 Starting with ${startCount} products\n`);
  
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let batchNum = 0;
  let consecutiveEmpty = 0;
  
  // Cycle through categories until target reached
  while (true) {
    const { count: currentCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    
    if (currentCount! >= args.target) {
      console.log(`\n🎉 Target reached! ${currentCount} products imported.`);
      break;
    }
    
    // Try each category
    for (const category of CATEGORIES) {
      batchNum++;
      const result = await importCategoryBatch(category, args.batchSize, batchNum);
      
      totalImported += result.imported;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      
      if (result.imported === 0) {
        consecutiveEmpty++;
      } else {
        consecutiveEmpty = 0;
      }
      
      const { count: newCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      console.log(`  📊 Progress: ${newCount}/${args.target} (${Math.round((newCount! / args.target) * 100)}%)`);
      
      if (newCount! >= args.target) {
        console.log(`\n🎉 Target reached! ${newCount} products imported.`);
        break;
      }
      
      // Stop if 5 consecutive categories yield nothing
      if (consecutiveEmpty >= 5) {
        console.log(`\n⚠️ No new products from last 5 categories. Database may be saturated.`);
        break;
      }
    }
    
    if (consecutiveEmpty >= 5) break;
  }
  
  const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  
  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Import Complete`);
  console.log(`   Starting: ${startCount} products`);
  console.log(`   Final: ${finalCount} products`);
  console.log(`   Imported: ${totalImported} products`);
  console.log(`   Skipped: ${totalSkipped} duplicates`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`═══════════════════════════════════════\n`);
}

main().catch(console.error);
