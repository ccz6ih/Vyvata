/**
 * Import supplements from Apify Vitacost scraper results
 * 
 * Usage:
 *   npx tsx scripts/vitacost-import.ts --file apify-results.json
 *   npx tsx scripts/vitacost-import.ts --url https://api.apify.com/v2/datasets/abc123/items
 */

import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface VitacostProduct {
  name: string;
  brand?: string;
  price?: number;
  url?: string;
  imageUrl?: string;
  ingredients?: string;
  servingSize?: string;
  servingsPerContainer?: number | string;
  description?: string;
  category?: string;
}

/**
 * Parse ingredients text into individual ingredient records
 */
function parseIngredients(ingredientsText: string): Array<{ name: string; amount: string | null }> {
  if (!ingredientsText) return [];
  
  // Split by common delimiters
  const parts = ingredientsText
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && p.length < 200);
  
  return parts.map(part => {
    // Try to extract amount (e.g., "Vitamin D3 (1000 IU)")
    const amountMatch = part.match(/\(([^)]+)\)/);
    const name = part.replace(/\([^)]+\)/g, '').trim();
    const amount = amountMatch ? amountMatch[1] : null;
    
    return { name, amount };
  });
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
 * Infer category from product name/description
 */
function inferCategory(name: string, description?: string): string {
  const text = (name + ' ' + (description || '')).toLowerCase();
  
  if (text.includes('omega') || text.includes('fish oil') || text.includes('dha') || text.includes('epa')) return 'omega-3';
  if (text.includes('vitamin d')) return 'vitamin-d';
  if (text.includes('magnesium')) return 'magnesium';
  if (text.includes('probiotic')) return 'probiotic';
  if (text.includes('multivitamin')) return 'multivitamin';
  if (text.includes('vitamin c') || text.includes('ascorbic')) return 'vitamin-c';
  if (text.includes('b complex') || text.includes('b-complex')) return 'b-complex';
  if (text.includes('coq10') || text.includes('coenzyme')) return 'coq10';
  if (text.includes('curcumin') || text.includes('turmeric')) return 'curcumin';
  if (text.includes('zinc')) return 'zinc';
  if (text.includes('b12') || text.includes('b-12')) return 'vitamin-b12';
  if (text.includes('iron')) return 'iron';
  if (text.includes('calcium')) return 'calcium';
  if (text.includes('collagen')) return 'collagen';
  if (text.includes('ashwagandha')) return 'ashwagandha';
  if (text.includes('biotin')) return 'biotin';
  if (text.includes('vitamin e')) return 'vitamin-e';
  if (text.includes('selenium')) return 'selenium';
  if (text.includes('vitamin k')) return 'vitamin-k';
  if (text.includes('folate') || text.includes('folic')) return 'folate';
  
  return 'general';
}

/**
 * Import a single product to database
 */
async function importProduct(product: VitacostProduct): Promise<boolean> {
  const brand = product.brand || 'Unknown';
  const name = product.name;
  
  // Skip if no ingredients
  if (!product.ingredients || product.ingredients.trim().length === 0) {
    return false;
  }
  
  // Parse ingredients
  const ingredients = parseIngredients(product.ingredients);
  if (ingredients.length === 0) {
    return false;
  }
  
  // Check for duplicate
  if (await isDuplicate(brand, name)) {
    return false;
  }
  
  const category = product.category || inferCategory(name, product.description);
  
  // Parse servings per container
  let servingsPerContainer = 30; // Default
  if (product.servingsPerContainer) {
    if (typeof product.servingsPerContainer === 'number') {
      servingsPerContainer = Math.round(product.servingsPerContainer);
    } else {
      const parsed = parseFloat(product.servingsPerContainer.toString());
      if (!isNaN(parsed)) {
        servingsPerContainer = Math.round(parsed);
      }
    }
  }
  
  // Insert product
  const { data: productData, error: productError } = await supabase
    .from('products')
    .insert({
      brand,
      name,
      category,
      product_url: product.url || null,
      image_url: product.imageUrl || null,
      serving_size: product.servingSize || '1 capsule',
      servings_per_container: servingsPerContainer,
      price_per_serving: product.price && servingsPerContainer > 0 
        ? Number((product.price / servingsPerContainer).toFixed(2))
        : null,
      manufacturer_id: null, // Will be backfilled later
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
      bioavailability_rating: inferBioavailability(ingredient.name),
    });
  }
  
  console.log(`   ✅ Imported: ${brand} - ${name}`);
  return true;
}

/**
 * Main import function
 */
async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='));
  const urlArg = args.find(a => a.startsWith('--url='));
  
  let products: VitacostProduct[] = [];
  
  if (fileArg) {
    // Load from local JSON file
    const filePath = fileArg.replace('--file=', '');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    products = JSON.parse(fileContent);
  } else if (urlArg) {
    // Fetch from Apify dataset URL
    const url = urlArg.replace('--url=', '');
    const response = await fetch(url);
    products = await response.json();
  } else {
    console.error('❌ Please provide --file=path/to/results.json or --url=https://api.apify.com/...');
    process.exit(1);
  }
  
  console.log(`🚀 Vitacost Import`);
  console.log(`   Found ${products.length} products in Apify results\n`);
  
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`📊 Starting with ${count} products\n`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      const success = await importProduct(product);
      if (success) {
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Error importing ${product.brand} - ${product.name}:`, error);
    }
  }
  
  const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  
  console.log('\n═══════════════════════════════════════');
  console.log('✅ Import Complete');
  console.log(`   Starting: ${count} products`);
  console.log(`   Final: ${finalCount} products`);
  console.log(`   Imported: ${imported} products`);
  console.log(`   Skipped: ${skipped} duplicates/no-ingredients`);
  console.log(`   Errors: ${errors}`);
  console.log('═══════════════════════════════════════\n');
}

main().catch(console.error);
