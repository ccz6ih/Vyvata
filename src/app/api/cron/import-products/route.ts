/**
 * Cron endpoint: Daily product import from DSLD
 * 
 * Schedule: 1 AM daily (before cache refresh at 2 AM)
 * Imports ~150 new products per run across all categories
 * Optimized to complete within Vercel's 5-minute timeout
 * 
 * Vercel Cron: 0 1 * * * (daily at 1 AM)
 * Manual test: POST /api/cron/import-products
 */

import { NextResponse } from "next/server";
import { searchDSLD, getDSLDProductById, type DSLDProduct } from "@/lib/dsld-api";
import { createClient } from "@supabase/supabase-js";

// Bypass RLS with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CONFIG = {
  maxProductsPerCategory: 10, // 15 categories × 10 = 150 products/day (optimized for Vercel timeout)
  categories: {
    'magnesium': ['magnesium glycinate', 'magnesium citrate', 'magnesium bisglycinate', 'magnesium malate'],
    'vitamin-d': ['vitamin d3', 'cholecalciferol', 'vitamin d 5000'],
    'omega-3': ['omega-3', 'fish oil', 'EPA DHA', 'omega 3'],
    'b-complex': ['b complex', 'b-complex', 'vitamin b'],
    'coq10': ['coq10', 'ubiquinol', 'coenzyme q10'],
    'curcumin': ['curcumin', 'turmeric'],
    'probiotic': ['probiotic', 'probiotics'],
    'zinc': ['zinc picolinate', 'zinc citrate', 'zinc'],
    'vitamin-c': ['vitamin c', 'ascorbic acid'],
    'creatine': ['creatine monohydrate', 'creatine'],
    'multivitamin': ['multivitamin', 'multi vitamin'],
    'ashwagandha': ['ashwagandha', 'withania'],
    'iron': ['iron bisglycinate', 'ferrous bisglycinate', 'iron'],
    'calcium': ['calcium citrate', 'calcium'],
    'collagen': ['collagen', 'collagen peptides'],
  },
  preferredBrands: [
    'Thorne', 'Life Extension', 'Pure Encapsulations', 'NOW Foods',
    'Jarrow Formulas', 'Nordic Naturals', 'Doctor\'s Best', 'Garden of Life',
    'Solgar', 'Nature\'s Way', 'Klaire Labs', 'Designs for Health',
  ],
  dsldRateLimit: 1200, // 1.2s between requests
};

type Bioavailability = 'HIGH' | 'MEDIUM' | 'LOW';

function inferBioavailability(form: string): Bioavailability {
  const formLower = form.toLowerCase();
  
  // High bioavailability forms
  if (formLower.includes('bisglycinate') || formLower.includes('glycinate') ||
      formLower.includes('citrate') || formLower.includes('malate') ||
      formLower.includes('picolinate') || formLower.includes('d3') ||
      formLower.includes('methylcobalamin') || formLower.includes('methylfolate') ||
      formLower.includes('ubiquinol')) {
    return 'HIGH';
  }
  
  // Low bioavailability forms
  if (formLower.includes('oxide') || formLower.includes('carbonate') ||
      formLower.includes('cyanocobalamin') || formLower.includes('folic acid')) {
    return 'LOW';
  }
  
  return 'MEDIUM';
}

function inferCategory(productName: string, ingredients: string[]): string {
  const nameLower = productName.toLowerCase();
  const allText = [nameLower, ...ingredients.map(i => i.toLowerCase())].join(' ');
  
  if (allText.includes('magnesium')) return 'magnesium';
  if (allText.includes('vitamin d') || allText.includes('cholecalciferol')) return 'vitamin-d';
  if (allText.includes('omega') || allText.includes('fish oil') || allText.includes('epa') || allText.includes('dha')) return 'omega-3';
  if (allText.includes('b complex') || allText.includes('b-complex')) return 'b-complex';
  if (allText.includes('probiotic')) return 'probiotic';
  if (allText.includes('creatine')) return 'creatine';
  if (allText.includes('zinc')) return 'zinc';
  if (allText.includes('coq10') || allText.includes('ubiquinol')) return 'coq10';
  if (allText.includes('curcumin') || allText.includes('turmeric')) return 'curcumin';
  if (allText.includes('multivitamin')) return 'multivitamin';
  if (allText.includes('vitamin c') || allText.includes('ascorbic')) return 'vitamin-c';
  
  return 'general';
}

function convertToVyvataFormat(dsldProduct: DSLDProduct, categoryHint: string) {
  const brand = dsldProduct.brandName || 'Unknown';
  const name = dsldProduct.fullName || 'Unknown Product';
  
  // Extract ingredients from ingredientRows
  const ingredients = (dsldProduct.ingredientRows || []).map((row: any) => {
    const qty = row.quantity?.[0];
    const form = row.forms?.[0]?.name || 'Standard';
    const doseValue = qty?.quantity ? parseFloat(qty.quantity) : 0;
    
    return {
      ingredient_name: row.name || 'Unknown',
      dose: doseValue,
      unit: qty?.unit || 'mg',
      form,
      bioavailability: inferBioavailability(form),
    };
  });
  
  const ingredientNames = ingredients.map(i => i.ingredient_name);
  const category = inferCategory(name, ingredientNames) || categoryHint;
  
  // Extract serving size
  const servingSize = dsldProduct.servingSizes?.[0] 
    ? `${dsldProduct.servingSizes[0].minQuantity} ${dsldProduct.servingSizes[0].unit}`
    : '1 capsule';
  
  const servingsPerContainer = dsldProduct.servingsPerContainer 
    ? parseInt(dsldProduct.servingsPerContainer) 
    : 30;
  
  return {
    brand,
    name,
    category,
    serving_size: servingSize,
    servings_per_container: servingsPerContainer,
    price_usd: 0, // Unknown from DSLD
    status: 'active' as const, // Auto-imported products are active by default
    ingredients,
    certifications: [], // Will be enriched later
    dsld_id: dsldProduct.id?.toString(),
  };
}

async function discoverProducts() {
  const discovered = new Map<string, any>(); // dsld_id → product
  let totalSearched = 0;
  
  for (const [category, searchTerms] of Object.entries(CONFIG.categories)) {
    console.log(`\n🔍 Searching category: ${category}`);
    
    for (const term of searchTerms) {
      try {
        const searchResult = await searchDSLD(term);
        const results = searchResult.products || [];
        totalSearched++;
        
        console.log(`  "${term}": ${results.length} results`);
        
        // Prioritize preferred brands
        const sorted = results.sort((a, b) => {
          const aPreferred = CONFIG.preferredBrands.includes(a.brandName || '');
          const bPreferred = CONFIG.preferredBrands.includes(b.brandName || '');
          if (aPreferred && !bPreferred) return -1;
          if (!aPreferred && bPreferred) return 1;
          return 0;
        });
        
        // Take top N per search term
        const limited = sorted.slice(0, CONFIG.maxProductsPerCategory);
        
        for (const item of limited) {
          if (item.id && !discovered.has(item.id.toString())) {
            // Skip database check - let upsert handle duplicates
            // Fetch full product details
            await new Promise(resolve => setTimeout(resolve, CONFIG.dsldRateLimit));
            const fullProduct = await getDSLDProductById(item.id.toString());
            
            if (fullProduct) {
              discovered.set(item.id.toString(), convertToVyvataFormat(fullProduct, category));
              console.log(`    ✓ ${item.brandName} - ${item.fullName}`);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.dsldRateLimit));
      } catch (error) {
        console.error(`  ❌ Error searching "${term}":`, error);
      }
    }
  }
  
  console.log(`\n📊 Discovery complete: ${discovered.size} unique products from ${totalSearched} searches`);
  return Array.from(discovered.values());
}

async function importProducts(products: any[]) {
  let imported = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      // Insert product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .upsert({
          brand: product.brand,
          name: product.name,
          category: product.category,
          serving_size: product.serving_size,
          servings_per_container: product.servings_per_container,
          price_usd: product.price_usd,
          status: product.status,
          // dsld_id field will be added in future migration
        }, { onConflict: 'brand,name' })
        .select()
        .single();
      
      if (productError) {
        console.error(`❌ Failed to import ${product.brand} - ${product.name}:`, productError);
        errors++;
        continue;
      }
      
      // Insert ingredients
      if (product.ingredients.length > 0) {
        // Delete existing ingredients first to avoid duplicates
        await supabase
          .from('product_ingredients')
          .delete()
          .eq('product_id', productData.id);
        
        const ingredientsToInsert = product.ingredients.map((ing: any) => ({
          product_id: productData.id,
          ingredient_name: ing.ingredient_name,
          dose: parseFloat(ing.dose) || 0,
          unit: ing.unit,
          form: ing.form,
          bioavailability: ing.bioavailability,
        }));
        
        const { error: ingError } = await supabase
          .from('product_ingredients')
          .insert(ingredientsToInsert);
        
        if (ingError) {
          console.error(`❌ Failed to insert ingredients for ${product.brand} - ${product.name}:`, ingError);
        }
      }
      
      imported++;
      console.log(`✓ Imported: ${product.brand} - ${product.name}`);
    } catch (error) {
      console.error(`❌ Error importing product:`, error);
      errors++;
    }
  }
  
  return { imported, errors };
}

// Vercel Cron sends GET, but we historically shipped this handler as
// POST-only. Wire GET → same handler so the scheduled cron stops 405'ing.
// Manual POST calls (e.g. admin scripts) still work unchanged.
async function handle(_request: Request) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting daily product import...');
    
    // Get current product count
    const { count: currentCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📦 Current products in database: ${currentCount || 0}`);
    
    // Discover new products
    const products = await discoverProducts();
    
    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new products to import',
        stats: {
          discovered: 0,
          imported: 0,
          errors: 0,
          duration: Date.now() - startTime,
          currentTotal: currentCount || 0,
        },
      });
    }
    
    // Import to database
    const { imported, errors } = await importProducts(products);
    
    // Get updated count
    const { count: newCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Import complete:`);
    console.log(`   Discovered: ${products.length}`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total products: ${newCount || 0}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
    
    return NextResponse.json({
      success: true,
      message: `Imported ${imported} new products`,
      stats: {
        discovered: products.length,
        imported,
        errors,
        duration,
        currentTotal: newCount || 0,
        added: (newCount || 0) - (currentCount || 0),
      },
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
