/**
 * Import Products from DSLD Database
 * 
 * Automatically enriches products from the NIH DSLD database and imports them
 * into your products table with full ingredient breakdowns.
 * 
 * Usage:
 *   npx tsx scripts/import-from-dsld.ts
 */

import { enrichStackFromDSLD } from '../src/lib/dsld-api';

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'supabase.co') || 'http://localhost:3000';

// ══════════════════════════════════════════════════════════════
// Products to Import from DSLD
// ══════════════════════════════════════════════════════════════

const PRODUCTS_TO_IMPORT = [
  // Add products by brand + name (DSLD will find them)
  { brand: 'Garden of Life', productName: 'Vitamin Code Raw D3' },
  { brand: 'Pure Encapsulations', productName: 'Magnesium Glycinate' },
  { brand: 'Jarrow Formulas', productName: 'Ubiquinol QH-absorb' },
  { brand: 'Nordic Naturals', productName: 'Nordic Omega-3 Fishies' },
  { brand: 'Vital Proteins', productName: 'Collagen Peptides' },
  
  // Or by UPC for exact match
  // { upc: '693465422717' },
];

// ══════════════════════════════════════════════════════════════
// Category Mapping (DSLD → Vyvata)
// ══════════════════════════════════════════════════════════════

function inferCategory(productName: string, ingredients: any[]): string {
  const name = productName.toLowerCase();
  
  // Check product name first
  if (name.includes('magnesium')) return 'magnesium';
  if (name.includes('vitamin d') || name.includes('vitamin d3')) return 'vitamin d';
  if (name.includes('omega') || name.includes('fish oil')) return 'omega-3';
  if (name.includes('b-complex') || name.includes('b complex')) return 'b-complex';
  if (name.includes('probiotic')) return 'probiotic';
  if (name.includes('creatine')) return 'creatine';
  if (name.includes('zinc')) return 'zinc';
  if (name.includes('coq10') || name.includes('ubiquinol')) return 'coq10';
  if (name.includes('curcumin') || name.includes('turmeric')) return 'curcumin';
  if (name.includes('multi') || name.includes('complete')) return 'multivitamin';
  if (name.includes('collagen')) return 'collagen';
  if (name.includes('protein') || name.includes('whey')) return 'protein';
  
  // Check ingredients
  const ingredientNames = ingredients.map(i => i.name.toLowerCase());
  if (ingredientNames.some(n => n.includes('magnesium'))) return 'magnesium';
  if (ingredientNames.some(n => n.includes('vitamin d'))) return 'vitamin d';
  if (ingredientNames.some(n => n.includes('epa') || n.includes('dha'))) return 'omega-3';
  
  // Default
  return 'supplement';
}

// ══════════════════════════════════════════════════════════════
// Bioavailability Inference
// ══════════════════════════════════════════════════════════════

function inferBioavailability(ingredientName: string, form?: string): 'high' | 'medium' | 'low' {
  if (!form) return 'medium';
  
  const formLower = form.toLowerCase();
  const nameLower = ingredientName.toLowerCase();
  
  // Magnesium
  if (nameLower.includes('magnesium')) {
    if (formLower.includes('bisglycinate') || formLower.includes('glycinate') || 
        formLower.includes('citrate') || formLower.includes('malate') ||
        formLower.includes('taurate') || formLower.includes('threonate')) {
      return 'high';
    }
    if (formLower.includes('oxide') || formLower.includes('carbonate')) {
      return 'low';
    }
    return 'medium';
  }
  
  // Vitamin D
  if (nameLower.includes('vitamin d')) {
    if (formLower.includes('d3') || formLower.includes('cholecalciferol')) {
      return 'high';
    }
    if (formLower.includes('d2') || formLower.includes('ergocalciferol')) {
      return 'medium';
    }
  }
  
  // B12
  if (nameLower.includes('b12') || nameLower.includes('cobalamin')) {
    if (formLower.includes('methyl') || formLower.includes('adenosyl') || 
        formLower.includes('hydroxo')) {
      return 'high';
    }
    if (formLower.includes('cyano')) {
      return 'low';
    }
  }
  
  // Folate
  if (nameLower.includes('folate') || nameLower.includes('folic')) {
    if (formLower.includes('methyl') || formLower.includes('5-mthf') || 
        formLower.includes('l-5-mthf')) {
      return 'high';
    }
    if (formLower.includes('folic acid')) {
      return 'low';
    }
  }
  
  // Omega-3
  if (nameLower.includes('epa') || nameLower.includes('dha')) {
    if (formLower.includes('triglyceride') || formLower.includes('phospholipid')) {
      return 'high';
    }
    if (formLower.includes('ethyl ester')) {
      return 'medium';
    }
  }
  
  // Zinc
  if (nameLower.includes('zinc')) {
    if (formLower.includes('picolinate') || formLower.includes('orotate') || 
        formLower.includes('citrate')) {
      return 'high';
    }
    if (formLower.includes('oxide') || formLower.includes('sulfate')) {
      return 'low';
    }
  }
  
  return 'medium';
}

// ══════════════════════════════════════════════════════════════
// Import Logic
// ══════════════════════════════════════════════════════════════

async function importFromDSLD() {
  console.log('🔬 Starting DSLD import...\n');
  
  if (PRODUCTS_TO_IMPORT.length === 0) {
    console.log('⚠️  No products specified in PRODUCTS_TO_IMPORT array');
    console.log('   Edit scripts/import-from-dsld.ts and add products\n');
    return;
  }
  
  console.log(`📦 Importing ${PRODUCTS_TO_IMPORT.length} products from DSLD...\n`);
  
  // Enrich from DSLD
  const enriched = await enrichStackFromDSLD(PRODUCTS_TO_IMPORT as any);
  
  // Convert to Vyvata format
  const vyvataProducts = [];
  
  for (let i = 0; i < enriched.length; i++) {
    const dsldProduct = enriched[i];
    const originalInput = PRODUCTS_TO_IMPORT[i];
    
    if (!dsldProduct) {
      console.log(`❌ ${originalInput.brand} ${originalInput.productName} - Not found in DSLD`);
      continue;
    }
    
    console.log(`✅ ${dsldProduct.brandName} ${dsldProduct.fullName}`);
    console.log(`   DSLD ID: ${dsldProduct.id}`);
    console.log(`   Ingredients: ${dsldProduct.ingredients?.length || 0}`);
    
    const category = inferCategory(
      dsldProduct.fullName, 
      dsldProduct.ingredients || []
    );
    
    const vyvataProduct = {
      brand: dsldProduct.brandName,
      name: dsldProduct.fullName,
      category,
      serving_size: dsldProduct.servingSizes?.[0] 
        ? `${dsldProduct.servingSizes[0].minQuantity} ${dsldProduct.servingSizes[0].unit}`
        : undefined,
      servings_per_container: dsldProduct.servingsPerContainer 
        ? parseInt(dsldProduct.servingsPerContainer)
        : undefined,
      status: 'active' as const,
      
      ingredients: (dsldProduct.ingredients || []).map((ing, idx) => ({
        ingredient_name: ing.name,
        dose: ing.quantity || 0,
        unit: ing.unit || 'mg',
        form: ing.ingredientForm,
        bioavailability: inferBioavailability(ing.name, ing.ingredientForm),
        display_order: idx + 1,
      })),
      
      certifications: [] as any[], // Add manually if known
    };
    
    vyvataProducts.push(vyvataProduct);
    console.log(`   → Category: ${category}`);
    console.log('');
  }
  
  if (vyvataProducts.length === 0) {
    console.log('❌ No products successfully enriched from DSLD\n');
    return;
  }
  
  // Import to database
  console.log(`📤 Importing ${vyvataProducts.length} products to database...\n`);
  
  const response = await fetch(`${API_URL}/api/admin/products/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      products: vyvataProducts,
      score: true, // Auto-calculate VSF scores
    }),
  });
  
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Import successful!');
    console.log(`   Created: ${result.counts.created}`);
    console.log(`   Updated: ${result.counts.updated}`);
    console.log(`   Errors: ${result.counts.errors}\n`);
    
    if (result.results) {
      result.results.forEach((r: any) => {
        const scoreInfo = r.scored 
          ? ` → VSF: ${r.scored.integrity}/100 (${r.scored.tier})`
          : '';
        console.log(`   ${r.action === 'created' ? '➕' : '🔄'} ${r.brand} ${r.name}${scoreInfo}`);
      });
    }
  } else {
    console.error('❌ Import failed:', result.error);
    if (result.errors) {
      result.errors.forEach((e: any) => {
        console.error(`   ${e.brand} ${e.name}: ${e.error}`);
      });
    }
  }
  
  console.log('\n✨ Import complete!');
  console.log('View products at: http://localhost:3000/admin/products\n');
}

// Run import
importFromDSLD().catch(console.error);
