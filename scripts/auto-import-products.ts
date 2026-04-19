/**
 * Product Auto-Import Agent
 * 
 * Automatically discovers and imports supplement products from DSLD database
 * with VSF integrity scoring and certification tracking.
 * 
 * Usage:
 *   npx tsx scripts/auto-import-products.ts
 *   npx tsx scripts/auto-import-products.ts --categories magnesium,omega-3
 *   npx tsx scripts/auto-import-products.ts --dry-run
 *   npx tsx scripts/auto-import-products.ts --limit 50
 */

import { searchDSLD, getDSLDProductById, DSLDProduct } from '../src/lib/dsld-api';
import { importProductsDirectly } from './db-import';

// ══════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════

const CONFIG = {
  // Discovery settings
  maxProductsPerCategory: 5,  // Per search term
  minVSFScore: 0,  // Set to 60 to skip low-quality products
  
  // Preferred brands (searched first)
  preferredBrands: [
    'Thorne',
    'Life Extension',
    'Pure Encapsulations',
    'NOW Foods',
    'Jarrow Formulas',
    'Nordic Naturals',
    'Doctor\'s Best',
    'Garden of Life',
    'Solgar',
    'Nature\'s Way',
  ],
  
  // Categories to discover
  categories: {
    'magnesium': ['magnesium glycinate', 'magnesium citrate', 'magnesium bisglycinate'],
    'vitamin-d': ['vitamin d3', 'cholecalciferol'],
    'omega-3': ['omega-3', 'fish oil', 'EPA DHA'],
    'b-complex': ['b complex', 'b-complex'],
    'coq10': ['coq10', 'ubiquinol', 'coenzyme q10'],
    'curcumin': ['curcumin', 'turmeric'],
    'probiotic': ['probiotic'],
    'zinc': ['zinc picolinate', 'zinc citrate'],
    'vitamin-c': ['vitamin c', 'ascorbic acid'],
    'multivitamin': ['multivitamin men', 'multivitamin women'],
  },
  
  // Quality filters
  skipProprietaryBlends: false,  // Set true to skip products with hidden doses
  requireFullIngredientList: true,
  
  // Rate limiting
  dsldRateLimit: 1200,  // ms between DSLD requests
  maxConcurrent: 2,
  
  // Auto-actions
  autoScore: false,  // Disabled temporarily - scoring needs debugging
  autoCertSync: false,  // Enable when cert scrapers are production-ready
};

// ══════════════════════════════════════════════════════════════
// Bioavailability Inference
// ══════════════════════════════════════════════════════════════

function inferBioavailability(ingredientName: string, form?: string): 'high' | 'medium' | 'low' {
  if (!form) return 'medium';
  
  const formLower = form.toLowerCase();
  const nameLower = ingredientName.toLowerCase();
  
  // Magnesium
  if (nameLower.includes('magnesium')) {
    if (formLower.match(/bisglycinate|glycinate|citrate|malate|taurate|threonate|l-threonate/)) {
      return 'high';
    }
    if (formLower.match(/oxide|carbonate|sulfate/)) {
      return 'low';
    }
    return 'medium';
  }
  
  // Vitamin D
  if (nameLower.includes('vitamin d')) {
    if (formLower.match(/d3|cholecalciferol/)) return 'high';
    if (formLower.match(/d2|ergocalciferol/)) return 'medium';
  }
  
  // B12
  if (nameLower.match(/b12|cobalamin/)) {
    if (formLower.match(/methyl|adenosyl|hydroxo/)) return 'high';
    if (formLower.match(/cyano/)) return 'low';
  }
  
  // Folate
  if (nameLower.match(/folate|folic/)) {
    if (formLower.match(/methyl|5-mthf|l-5-mthf|l-methylfolate/)) return 'high';
    if (formLower.match(/folic acid/)) return 'low';
  }
  
  // Omega-3
  if (nameLower.match(/epa|dha|omega/)) {
    if (formLower.match(/triglyceride|phospholipid|rTG/)) return 'high';
    if (formLower.match(/ethyl ester/)) return 'medium';
  }
  
  // Zinc
  if (nameLower.includes('zinc')) {
    if (formLower.match(/picolinate|orotate|citrate|bisglycinate/)) return 'high';
    if (formLower.match(/oxide|sulfate/)) return 'low';
  }
  
  // CoQ10
  if (nameLower.match(/coq10|ubiquinol|ubiquinone/)) {
    if (nameLower.includes('ubiquinol')) return 'high';
    if (nameLower.includes('ubiquinone')) return 'medium';
  }
  
  return 'medium';
}

// ══════════════════════════════════════════════════════════════
// Category Inference
// ══════════════════════════════════════════════════════════════

function inferCategory(productName: string, ingredients: any[]): string {
  const name = productName.toLowerCase();
  
  // Check product name first
  if (name.match(/magnesium/)) return 'magnesium';
  if (name.match(/vitamin d|vit d|d3|d-3/)) return 'vitamin d';
  if (name.match(/omega|fish oil|epa|dha/)) return 'omega-3';
  if (name.match(/b.?complex|b complex/)) return 'b-complex';
  if (name.match(/probiotic|lactobacillus|bifidobacterium/)) return 'probiotic';
  if (name.match(/creatine/)) return 'creatine';
  if (name.match(/\bzinc\b/)) return 'zinc';
  if (name.match(/coq10|ubiquinol|coenzyme/)) return 'coq10';
  if (name.match(/curcumin|turmeric/)) return 'curcumin';
  if (name.match(/multi|complete formula/)) return 'multivitamin';
  if (name.match(/vitamin c|ascorbic/)) return 'vitamin c';
  if (name.match(/collagen/)) return 'collagen';
  if (name.match(/protein|whey/)) return 'protein';
  
  // Check ingredients
  const ingredientNames = ingredients.map(i => i.name?.toLowerCase() || '').join(' ');
  if (ingredientNames.includes('magnesium')) return 'magnesium';
  if (ingredientNames.includes('vitamin d')) return 'vitamin d';
  if (ingredientNames.match(/epa|dha/)) return 'omega-3';
  
  return 'supplement';
}

// ══════════════════════════════════════════════════════════════
// Product Discovery
// ══════════════════════════════════════════════════════════════

async function discoverProducts(categoryFilter?: string[]): Promise<DSLDProduct[]> {
  const discovered: Map<number, DSLDProduct> = new Map(); // Use DSLD ID to dedupe
  
  const categoriesToSearch = categoryFilter 
    ? Object.entries(CONFIG.categories).filter(([cat]) => categoryFilter.includes(cat))
    : Object.entries(CONFIG.categories);
  
  console.log(`\n🔍 Discovering products from ${categoriesToSearch.length} categories...\n`);
  
  for (const [categoryName, searchTerms] of categoriesToSearch) {
    console.log(`📂 Category: ${categoryName}`);
    
    for (const term of searchTerms) {
      try {
        // Search DSLD
        const results = await searchDSLD(term, { perPage: CONFIG.maxProductsPerCategory });
        
        console.log(`   "${term}" → ${results.products.length} products found`);
        
        // Add to discovered set (deduped by ID)
        for (const product of results.products) {
          if (!discovered.has(product.id)) {
            discovered.set(product.id, product);
          }
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, CONFIG.dsldRateLimit));
        
      } catch (error: any) {
        console.error(`   ❌ Error searching "${term}":`, error.message);
      }
    }
  }
  
  const allProducts = Array.from(discovered.values());
  console.log(`\n✅ Discovered ${allProducts.length} unique products\n`);
  
  return allProducts;
}

// ══════════════════════════════════════════════════════════════
// Convert DSLD to Vyvata Format
// ══════════════════════════════════════════════════════════════

function convertToVyvataFormat(dsldProduct: DSLDProduct) {
  const category = inferCategory(
    dsldProduct.fullName,
    dsldProduct.ingredients || []
  );
  
  return {
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
    
    certifications: [] as any[],
  };
}

// ══════════════════════════════════════════════════════════════
// Main Auto-Import Function
// ══════════════════════════════════════════════════════════════

async function autoImportProducts(options: {
  categories?: string[];
  dryRun?: boolean;
  limit?: number;
}) {
  console.log('🤖 Product Auto-Import Agent Starting...\n');
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (preview only)' : 'LIVE IMPORT'}`);
  console.log(`Categories: ${options.categories?.join(', ') || 'ALL'}`);
  console.log(`Limit: ${options.limit || 'No limit'}\n`);
  
  // Step 1: Discover products
  const discovered = await discoverProducts(options.categories);
  
  let productsToImport = discovered;
  
  // Apply limit
  if (options.limit && productsToImport.length > options.limit) {
    console.log(`⚠️  Limiting to first ${options.limit} products\n`);
    productsToImport = productsToImport.slice(0, options.limit);
  }
  
  // Step 2: Enrich with full ingredient data
  console.log(`🔍 Fetching full ingredient data for ${productsToImport.length} products...\n`);
  
  const enrichedProducts: DSLDProduct[] = [];
  for (let i = 0; i < productsToImport.length; i++) {
    const product = productsToImport[i];
    try {
      console.log(`   ${i + 1}/${productsToImport.length}: ${product.brandName} ${product.fullName}...`);
      
      // Fetch full product details with ingredients
      const fullProduct = await getDSLDProductById(product.id.toString());
      
      if (fullProduct && fullProduct.ingredients && fullProduct.ingredients.length > 0) {
        enrichedProducts.push(fullProduct);
      } else {
        console.log(`      ⚠️  No ingredients found`);
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, CONFIG.dsldRateLimit));
      
    } catch (error: any) {
      console.error(`      ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Enriched ${enrichedProducts.length}/${productsToImport.length} products with ingredient data\n`);
  
  // Step 3: Convert to Vyvata format
  console.log(`📦 Converting ${enrichedProducts.length} products to Vyvata format...\n`);
  
  const vyvataProducts = enrichedProducts
    .filter(p => p.ingredients && p.ingredients.length > 0)  // Double-check ingredients
    .map(convertToVyvataFormat);
  
  if (vyvataProducts.length === 0) {
    console.log('❌ No products with ingredient data found\n');
    return;
  }
  
  // Step 3: Preview
  console.log(`📋 Preview of products to import:\n`);
  vyvataProducts.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.brand} ${p.name}`);
    console.log(`   Category: ${p.category}`);
    console.log(`   Ingredients: ${p.ingredients.length}`);
    if (p.ingredients[0]) {
      const ing = p.ingredients[0];
      console.log(`   Primary: ${ing.ingredient_name} ${ing.dose}${ing.unit} (${ing.bioavailability} bioavailability)`);
    }
    console.log('');
  });
  
  if (vyvataProducts.length > 5) {
    console.log(`... and ${vyvataProducts.length - 5} more products\n`);
  }
  
  // Step 5: Import (or dry run)
  if (options.dryRun) {
    console.log('✅ DRY RUN COMPLETE - No products were imported');
    console.log(`\nTo import, run: npx tsx scripts/auto-import-products.ts\n`);
    return;
  }
  
  console.log(`📤 Importing ${vyvataProducts.length} products to database...\n`);
  
  const result = await importProductsDirectly(vyvataProducts, {
    autoScore: CONFIG.autoScore,
  });
  
  if (result.ok) {
    console.log('✅ Import successful!\n');
    console.log(`   Created: ${result.counts.created}`);
    console.log(`   Updated: ${result.counts.updated}`);
    console.log(`   Errors: ${result.counts.errors}\n`);
    
    if (result.results && result.results.length > 0) {
      // Group by tier
      const byTier: Record<string, number> = {};
      result.results.forEach((r: any) => {
        if (r.scored) {
          const tier = r.scored.tier;
          byTier[tier] = (byTier[tier] || 0) + 1;
        }
      });
      
      console.log('📊 VSF Score Distribution:');
      Object.entries(byTier).forEach(([tier, count]) => {
        const emoji = tier === 'elite' ? '🏆' : tier === 'verified' ? '✅' : tier === 'standard' ? '⚠️' : '❌';
        console.log(`   ${emoji} ${tier.toUpperCase()}: ${count}`);
      });
      console.log('');
      
      // Show top scorers
      const sorted = result.results
        .filter((r: any) => r.scored)
        .sort((a: any, b: any) => b.scored.integrity - a.scored.integrity);
      
      console.log('🏆 Top 5 Products:');
      sorted.slice(0, 5).forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.brand} ${r.name}`);
        console.log(`      VSF: ${r.scored.integrity}/100 (${r.scored.tier})`);
      });
      console.log('');
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.slice(0, 5).forEach((e: any) => {
        console.log(`   ${e.brand} ${e.name}: ${e.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
      console.log('');
    }
  } else {
    console.error('❌ Import failed:', result.error);
    if (result.errors) {
      result.errors.slice(0, 10).forEach((e: any) => {
        console.error(`   ${e.brand} ${e.name}: ${e.error}`);
      });
    }
    process.exit(1);
  }
  
  console.log('✨ Auto-import complete!\n');
}

// ══════════════════════════════════════════════════════════════
// CLI Interface
// ══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const options = {
  categories: args.includes('--categories')
    ? args[args.indexOf('--categories') + 1]?.split(/[,\s]+/).filter(Boolean)
    : undefined,
  dryRun: args.includes('--dry-run'),
  limit: args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1])
    : undefined,
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Product Auto-Import Agent

Usage:
  npx tsx scripts/auto-import-products.ts [options]

Options:
  --categories <list>   Comma-separated categories to import
  --limit <number>      Maximum number of products to import
  --dry-run             Preview without importing
  --help, -h            Show this help message

Examples:
  npx tsx scripts/auto-import-products.ts
  npx tsx scripts/auto-import-products.ts --categories magnesium,omega-3
  npx tsx scripts/auto-import-products.ts --limit 20 --dry-run

Available categories:
  ${Object.keys(CONFIG.categories).join(', ')}
`);
  process.exit(0);
}

// Run auto-import
autoImportProducts(options).catch(err => {
  console.error('❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
