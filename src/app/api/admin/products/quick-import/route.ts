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
  productsPerBatch: 20, // Small batch to complete quickly (~25-30 seconds)
  categories: ['magnesium', 'vitamin-d', 'omega-3', 'b-complex', 'probiotic', 'zinc', 'vitamin-c'],
  searchTerms: {
    'magnesium': 'magnesium glycinate',
    'vitamin-d': 'vitamin d3',
    'omega-3': 'omega-3',
    'b-complex': 'b complex',
    'probiotic': 'probiotic',
    'zinc': 'zinc',
    'vitamin-c': 'vitamin c',
  },
  preferredBrands: [
    'Thorne', 'Life Extension', 'Pure Encapsulations', 'NOW Foods',
    'Jarrow Formulas', 'Nordic Naturals', 'Doctor\'s Best', 'Garden of Life',
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
    
    return {
      ingredient_name: row.name || 'Unknown',
      dose: qty?.quantity?.toString() || '0',
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
    
    // Sort by preferred brands
    const sorted = results.sort((a, b) => {
      const aPreferred = CONFIG.preferredBrands.includes(a.brandName || '');
      const bPreferred = CONFIG.preferredBrands.includes(b.brandName || '');
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    });
    
    // Take top N
    const limited = sorted.slice(0, CONFIG.productsPerBatch);
    
    for (const item of limited) {
      if (item.id) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.dsldRateLimit));
        const fullProduct = await getDSLDProductById(item.id.toString());
        
        if (fullProduct) {
          discovered.push(convertToVyvataFormat(fullProduct, randomCategory));
          console.log(`  ✓ ${fullProduct.brandName} - ${fullProduct.fullName}`);
        }
      }
    }
    
    // Import to database
    let imported = 0;
    let skipped = 0;
    
    for (const product of discovered) {
      try {
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
          }, {
            onConflict: 'brand,name',
            ignoreDuplicates: true
          })
          .select()
          .single();
        
        if (productError) {
          if (productError.code === '23505') {
            skipped++;
            continue;
          }
          throw productError;
        }
        
        if (productData && product.ingredients.length > 0) {
          const ingredientsToInsert = product.ingredients.map((ing: any) => ({
            product_id: productData.id,
            ingredient_name: ing.ingredient_name,
            dose: ing.dose,
            unit: ing.unit,
            form: ing.form,
            bioavailability: ing.bioavailability,
          }));
          
          await supabase.from('product_ingredients').insert(ingredientsToInsert);
        }
        
        imported++;
      } catch (error) {
        console.error(`❌ Error importing:`, error);
      }
    }
    
    // Get current total
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Batch complete: ${imported} imported, ${skipped} skipped, ${(duration/1000).toFixed(1)}s`);
    
    return NextResponse.json({
      success: true,
      message: `Imported ${imported} products from ${randomCategory}`,
      stats: {
        discovered: discovered.length,
        imported,
        skipped,
        category: randomCategory,
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
