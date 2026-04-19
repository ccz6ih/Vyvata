/**
 * Add Products to Vyvata Database
 * 
 * Three ways to add products:
 * 1. Manual product definitions (like below)
 * 2. Import from DSLD by UPC or brand+name
 * 3. Bulk import from JSON file
 * 
 * Usage:
 *   npx tsx scripts/add-products.ts
 */

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'supabase.co') || 'http://localhost:3000';

// ══════════════════════════════════════════════════════════════
// OPTION 1: Manual Product Definitions
// ══════════════════════════════════════════════════════════════

const PRODUCTS_TO_ADD = [
  // Add more magnesium products
  {
    brand: 'Pure Encapsulations',
    name: 'Magnesium Glycinate',
    category: 'magnesium',
    serving_size: '2 capsules',
    servings_per_container: 90,
    price_usd: 26.40,
    product_url: 'https://www.pureencapsulations.com/magnesium-glycinate.html',
    ingredients: [
      {
        ingredient_name: 'Magnesium',
        dose: 120,
        unit: 'mg',
        form: 'glycinate',
        bioavailability: 'high' as const,
        display_order: 1,
      }
    ],
    certifications: [
      { type: 'nsf_gmp' as const, verified: true },
      { type: 'non_gmo' as const, verified: true },
      { type: 'gluten_free' as const, verified: true },
    ]
  },
  
  {
    brand: 'Jarrow Formulas',
    name: 'Magnesium Optimizer',
    category: 'magnesium',
    serving_size: '3 tablets',
    servings_per_container: 100,
    price_usd: 14.95,
    ingredients: [
      {
        ingredient_name: 'Magnesium',
        dose: 200,
        unit: 'mg',
        form: 'malate',
        bioavailability: 'high' as const,
        display_order: 1,
      },
      {
        ingredient_name: 'Vitamin B6',
        dose: 20,
        unit: 'mg',
        form: 'pyridoxine HCl',
        bioavailability: 'medium' as const,
        display_order: 2,
      }
    ],
    certifications: []
  },

  // Add CoQ10 products
  {
    brand: 'Life Extension',
    name: 'Super Ubiquinol CoQ10',
    category: 'coq10',
    serving_size: '1 softgel',
    servings_per_container: 60,
    price_usd: 32.00,
    manufacturer: {
      name: 'Life Extension',
      website: 'https://www.lifeextension.com',
      country: 'USA',
      gmp_certified: true,
      third_party_tested: true,
    },
    ingredients: [
      {
        ingredient_name: 'CoQ10',
        dose: 100,
        unit: 'mg',
        form: 'ubiquinol',
        bioavailability: 'high' as const,
        display_order: 1,
      }
    ],
    certifications: [
      { type: 'usp_verified' as const, verified: true }
    ]
  },

  {
    brand: 'Qunol',
    name: 'Ultra CoQ10',
    category: 'coq10',
    serving_size: '1 softgel',
    servings_per_container: 120,
    price_usd: 44.99,
    ingredients: [
      {
        ingredient_name: 'CoQ10',
        dose: 100,
        unit: 'mg',
        form: 'ubiquinone',
        bioavailability: 'medium' as const,
        display_order: 1,
      }
    ],
    certifications: []
  },

  // Add Curcumin products
  {
    brand: 'Thorne',
    name: 'Meriva 500-SF',
    category: 'curcumin',
    serving_size: '1 capsule',
    servings_per_container: 120,
    price_usd: 58.00,
    manufacturer: {
      name: 'Thorne Research',
      website: 'https://www.thorne.com',
      country: 'USA',
      gmp_certified: true,
      third_party_tested: true,
    },
    ingredients: [
      {
        ingredient_name: 'Curcumin',
        dose: 500,
        unit: 'mg',
        form: 'Meriva (phosphatidylcholine complex)',
        bioavailability: 'high' as const,
        display_order: 1,
      }
    ],
    certifications: [
      { type: 'nsf_sport' as const, verified: true }
    ]
  },
];

// ══════════════════════════════════════════════════════════════
// OPTION 2: Import from DSLD by UPC or Brand+Name
// ══════════════════════════════════════════════════════════════

const DSLD_IMPORTS = [
  // Import by UPC (most accurate)
  { upc: '693465422717' }, // Example UPC
  
  // Or by brand + product name
  { brand: 'Garden of Life', productName: 'Vitamin Code Raw D3' },
  { brand: 'Athletic Greens', productName: 'AG1' },
];

// ══════════════════════════════════════════════════════════════
// Import Logic
// ══════════════════════════════════════════════════════════════

async function importProducts() {
  console.log('🚀 Starting product import...\n');

  // Import manually defined products
  if (PRODUCTS_TO_ADD.length > 0) {
    console.log(`📦 Importing ${PRODUCTS_TO_ADD.length} manually defined products...`);
    
    const response = await fetch(`${API_URL}/api/admin/products/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: PRODUCTS_TO_ADD,
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
          const scoreInfo = r.scored ? ` (VSF: ${r.scored.integrity}, Tier: ${r.scored.tier})` : '';
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
    console.log('');
  }

  // Import from DSLD
  if (DSLD_IMPORTS.length > 0) {
    console.log(`🔬 Importing ${DSLD_IMPORTS.length} products from DSLD...`);
    console.log('⚠️  DSLD import not yet implemented - add importFromDSLD() function');
    console.log('   This would:');
    console.log('   1. Call enrichStackFromDSLD() for each item');
    console.log('   2. Convert DSLD response to product format');
    console.log('   3. POST to /api/admin/products/import');
    console.log('');
  }

  console.log('✨ Import complete!\n');
  console.log('View products at: http://localhost:3000/admin/products');
}

// Run import
importProducts().catch(console.error);
