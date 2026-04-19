/**
 * Quick Test: Add a Single Product
 * 
 * Fast way to test the import system with one product
 * 
 * Usage:
 *   npx tsx scripts/quick-add.ts "Thorne" "Magnesium Bisglycinate"
 */

const brand = process.argv[2];
const productName = process.argv[3];

if (!brand || !productName) {
  console.log('Usage: npx tsx scripts/quick-add.ts "Brand" "Product Name"');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/quick-add.ts "Thorne" "Vitamin D-3"');
  console.log('  npx tsx scripts/quick-add.ts "NOW Foods" "Omega-3"');
  console.log('  npx tsx scripts/quick-add.ts "Life Extension" "Super Ubiquinol CoQ10"');
  process.exit(1);
}

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'supabase.co') || 'http://localhost:3000';

async function quickAdd() {
  console.log(`🔍 Searching DSLD for: ${brand} ${productName}\n`);
  
  // Import DSLD enrichment
  const { enrichStackFromDSLD } = await import('../src/lib/dsld-api');
  
  // Try to find in DSLD
  const enriched = await enrichStackFromDSLD([{ brand, productName }]);
  const dsldProduct = enriched[0];
  
  if (!dsldProduct) {
    console.log(`❌ Product not found in DSLD database`);
    console.log(`\nTry one of these options:`);
    console.log(`1. Check the exact spelling on the product label`);
    console.log(`2. Search DSLD manually: https://dsld.od.nih.gov/`);
    console.log(`3. Add manually using scripts/add-products.ts\n`);
    process.exit(1);
  }
  
  console.log(`✅ Found in DSLD!`);
  console.log(`   Full Name: ${dsldProduct.fullName}`);
  console.log(`   Brand: ${dsldProduct.brandName}`);
  console.log(`   DSLD ID: ${dsldProduct.id}`);
  console.log(`   Ingredients: ${dsldProduct.ingredients?.length || 0}\n`);
  
  if (dsldProduct.ingredients && dsldProduct.ingredients.length > 0) {
    console.log(`📋 Ingredients:`);
    dsldProduct.ingredients.slice(0, 5).forEach((ing: any) => {
      const form = ing.ingredientForm ? ` (${ing.ingredientForm})` : '';
      console.log(`   • ${ing.name}: ${ing.quantity}${ing.unit}${form}`);
    });
    if (dsldProduct.ingredients.length > 5) {
      console.log(`   ... and ${dsldProduct.ingredients.length - 5} more`);
    }
    console.log('');
  }
  
  // Convert to Vyvata format (basic)
  const vyvataProduct = {
    brand: dsldProduct.brandName,
    name: dsldProduct.fullName,
    category: 'supplement', // You can refine this
    status: 'active',
    ingredients: (dsldProduct.ingredients || []).map((ing: any, idx: number) => ({
      ingredient_name: ing.name,
      dose: ing.quantity || 0,
      unit: ing.unit || 'mg',
      form: ing.ingredientForm,
      bioavailability: 'medium', // Auto-detected on server
      display_order: idx + 1,
    })),
    certifications: [],
  };
  
  console.log(`📤 Importing to database...\n`);
  
  const response = await fetch(`${API_URL}/api/admin/products/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      products: [vyvataProduct],
      score: true,
    }),
  });
  
  const result = await response.json();
  
  if (result.ok && result.results?.[0]) {
    const r = result.results[0];
    console.log(`✅ Success!`);
    console.log(`   ${r.action === 'created' ? 'Created new product' : 'Updated existing product'}`);
    if (r.scored) {
      console.log(`   VSF Score: ${r.scored.integrity}/100`);
      console.log(`   Tier: ${r.scored.tier.toUpperCase()}`);
    }
    console.log(`\n🔗 View at: http://localhost:3000/admin/products\n`);
  } else {
    console.error(`❌ Import failed:`, result.error || result.errors?.[0]?.error);
    process.exit(1);
  }
}

quickAdd().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
