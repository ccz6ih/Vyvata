/**
 * Admin endpoint: Quick DSLD import
 * 
 * Imports a small batch of products (~20-30) from DSLD to avoid timeout
 * Can be triggered multiple times to build catalog quickly
 */

import { NextResponse } from "next/server";
import { searchDSLD, getDSLDProductById, type DSLDProduct } from "@/lib/dsld-api";
import { createClient } from "@supabase/supabase-js";
import { hasAdminSession } from "@/lib/admin-auth";

// Bypass RLS with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CONFIG = {
  productsPerBatch: 50, // Larger batch to import faster (was 20)
  maxSearchResults: 200, // Look through more results to find non-duplicates (was 100)
  categories: [
    'magnesium', 'vitamin-d', 'omega-3', 'b-complex', 'probiotic', 'zinc', 'vitamin-c',
    'curcumin', 'coq10', 'multivitamin', 'collagen', 'ashwagandha', 'iron',
    'calcium', 'vitamin-k', 'biotin', 'folate', 'vitamin-b12', 'vitamin-e',
    'selenium', 'chromium', 'rhodiola', 'ginkgo', 'milk-thistle'
  ],
  searchTerms: {
    'magnesium': 'magnesium',
    'vitamin-d': 'vitamin d',
    'omega-3': 'fish oil',
    'b-complex': 'b complex',
    'probiotic': 'probiotic',
    'zinc': 'zinc',
    'vitamin-c': 'vitamin c',
    'curcumin': 'curcumin',
    'coq10': 'coq10',
    'multivitamin': 'multivitamin',
    'collagen': 'collagen',
    'ashwagandha': 'ashwagandha',
    'iron': 'iron',
    'calcium': 'calcium',
    'vitamin-k': 'vitamin k2',
    'biotin': 'biotin',
    'folate': 'methylfolate',
    'vitamin-b12': 'vitamin b12',
    'vitamin-e': 'vitamin e',
    'selenium': 'selenium',
    'chromium': 'chromium',
    'rhodiola': 'rhodiola',
    'ginkgo': 'ginkgo biloba',
    'milk-thistle': 'milk thistle'
  },
  preferredBrands: [
    'Thorne', 'Life Extension', 'Pure Encapsulations', 'NOW Foods',
    'Jarrow Formulas', 'Nordic Naturals', 'Doctor\'s Best', 'Garden of Life',
    'Solgar', 'Nature\'s Way', 'Vital Proteins', 'Ancient Nutrition',
    'Bluebonnet', 'Designs for Health', 'Integrative Therapeutics'
  ],
  dsldRateLimit: 800, // 0.8s between requests (faster for manual imports)
};

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

function inferCategory(productName: string, ingredients: string[]): string {
  const allText = [productName, ...ingredients].join(' ').toLowerCase();
  
  if (allText.includes('magnesium')) return 'magnesium';
  if (allText.includes('vitamin d') || allText.includes('cholecalciferol')) return 'vitamin-d';
  if (allText.includes('omega') || allText.includes('fish oil')) return 'omega-3';
  if (allText.includes('b complex') || allText.includes('b-complex')) return 'b-complex';
  if (allText.includes('probiotic')) return 'probiotic';
  if (allText.includes('zinc')) return 'zinc';
  if (allText.includes('vitamin c')) return 'vitamin-c';
  
  return 'general';
}

function convertToVyvataFormat(dsldProduct: DSLDProduct, categoryHint: string) {
  const brand = dsldProduct.brandName || 'Unknown';
  const name = dsldProduct.fullName || 'Unknown Product';
  
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
    price_usd: 0,
    status: 'active' as const,
    ingredients,
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  // Check admin auth
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log('🚀 Starting quick DSLD import batch...');
    
    const discovered = [];
    const randomCategory = CONFIG.categories[Math.floor(Math.random() * CONFIG.categories.length)];
    const searchTerm = CONFIG.searchTerms[randomCategory as keyof typeof CONFIG.searchTerms];
    
    console.log(`🔍 Searching: ${searchTerm} (${randomCategory})`);
    
    const searchResult = await searchDSLD(searchTerm);
    const results = searchResult.products || [];
    
    console.log(`   Found ${results.length} DSLD results`);
    
    // Sort by preferred brands
    const sorted = results.sort((a, b) => {
      const aPreferred = CONFIG.preferredBrands.includes(a.brandName || '');
      const bPreferred = CONFIG.preferredBrands.includes(b.brandName || '');
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    });
    
    // Search through MORE results to find non-duplicates
    const maxToCheck = Math.min(sorted.length, CONFIG.maxSearchResults);
    let checked = 0;
    let skippedDuplicates = 0;
    
    for (const item of sorted) {
      checked++;
      
      // Stop if we have enough products
      if (discovered.length >= CONFIG.productsPerBatch) {
        console.log(`   ✓ Found ${CONFIG.productsPerBatch} new products (checked ${checked}/${maxToCheck})`);
        break;
      }
      
      // Stop if we've checked max results
      if (checked > maxToCheck) {
        console.log(`   ⚠️ Checked ${maxToCheck} results, found ${discovered.length} new products`);
        break;
      }
      
      if (!item.id || !item.brandName || !item.fullName) {
        continue;
      }
      
      // Check for duplicate BEFORE fetching full product details
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('brand', item.brandName)
        .eq('name', item.fullName)
        .single();
      
      if (existingProduct) {
        skippedDuplicates++;
        if (skippedDuplicates % 10 === 0) {
          console.log(`   ... skipped ${skippedDuplicates} duplicates so far`);
        }
        continue; // Skip, already in database
      }
      
      // Not a duplicate - fetch full details
      await new Promise(resolve => setTimeout(resolve, CONFIG.dsldRateLimit));
      const fullProduct = await getDSLDProductById(item.id.toString());
      
      if (fullProduct && fullProduct.ingredientRows && fullProduct.ingredientRows.length > 0) {
        discovered.push(convertToVyvataFormat(fullProduct, randomCategory));
        console.log(`  ✓ ${fullProduct.brandName} - ${fullProduct.fullName} (${fullProduct.ingredientRows.length} ingredients)`);
      } else {
        console.log(`  ⚠️ Skipping ${item.brandName} - ${item.fullName} (no ingredients)`);
      }
    }
    
    if (discovered.length === 0) {
      console.log(`⚠️ No new products found for "${searchTerm}" - all top ${checked} results are duplicates or invalid`);
      console.log(`   Try a different category or clean up empty products`);
      
      return NextResponse.json({
        success: true,
        message: `No new products found for ${randomCategory} (${skippedDuplicates} duplicates)`,
        stats: {
          discovered: 0,
          imported: 0,
          skipped: skippedDuplicates,
          category: randomCategory,
          duration: Date.now() - startTime,
          currentTotal: (await supabase.from('products').select('*', { count: 'exact', head: true })).count || 0,
        },
      });
    }
    
    // Import to database
    let imported = 0;
    let errors = 0;
    
    for (const product of discovered) {
      try {
        // Double-check for duplicates (defensive programming)
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('brand', product.brand)
          .eq('name', product.name)
          .single();
        
        if (existingProduct) {
          console.log(`  ⚠️ Race condition: ${product.brand} - ${product.name} was inserted by another process`);
          continue;
        }
        
        // Insert new product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            brand: product.brand,
            name: product.name,
            category: product.category,
            serving_size: product.serving_size,
            servings_per_container: product.servings_per_container,
            price_usd: product.price_usd,
            status: product.status,
          })
          .select()
          .single();
        
        if (productError) {
          throw productError;
        }
        
        // Insert ingredients if product was created and has ingredients
        if (productData && product.ingredients.length > 0) {
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
            errors++;
          } else {
            imported++;
          }
        } else {
          imported++;
        }
      } catch (error) {
        console.error(`❌ Error importing ${product.brand} - ${product.name}:`, error);
        errors++;
      }
    }
    
    // Get current total
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Batch complete: ${imported} imported, ${skippedDuplicates} duplicates skipped, ${errors} errors, ${(duration/1000).toFixed(1)}s`);
    
    return NextResponse.json({
      success: true,
      message: `Imported ${imported} new ${randomCategory} products`,
      stats: {
        discovered: discovered.length,
        imported,
        skipped: skippedDuplicates,
        errors,
        category: randomCategory,
        searchTerm,
        checked,
        duration,
        currentTotal: count || 0,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Import failed',
    }, { status: 500 });
  }
}
