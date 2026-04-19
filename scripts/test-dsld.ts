/**
 * Test DSLD API Integration
 * 
 * Run with: node --loader ts-node/esm scripts/test-dsld.ts
 * Or: tsx scripts/test-dsld.ts
 */

import { 
  searchDSLD, 
  getDSLDProductByUPC, 
  getDSLDProductById,
  checkDSLDAvailability 
} from '../src/lib/dsld-api';

async function testDSLD() {
  console.log('🧪 Testing DSLD API Integration...\n');
  
  // Test 1: Health check
  console.log('1️⃣ Testing API availability...');
  try {
    const isAvailable = await checkDSLDAvailability();
    console.log(`   ✅ DSLD API is ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}\n`);
  } catch (error: any) {
    console.error(`   ❌ Health check failed: ${error.message}\n`);
  }
  
  // Test 2: Search by product name
  console.log('2️⃣ Testing search for "magnesium"...');
  try {
    const results = await searchDSLD('magnesium');
    console.log(`   ✅ Found ${results.total_results} results`);
    
    if (results.products.length > 0) {
      const first = results.products[0];
      console.log(`   📦 First result:`);
      console.log(`      - Brand: ${first.brandName || 'N/A'}`);
      console.log(`      - Product: ${first.fullName || 'N/A'}`);
      console.log(`      - DSLD ID: ${first.id || 'N/A'}`);
      console.log(`      - Ingredients: ${first.ingredients?.length || 0}\n`);
    } else {
      console.log(`   ⚠️  No products found\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Search failed: ${error.message}\n`);
  }
  
  // Test 3: Get product by DSLD ID (using example from API docs)
  console.log('3️⃣ Testing get product by DSLD ID (82118)...');
  try {
    const product = await getDSLDProductById('82118');
    
    if (product) {
      console.log(`   ✅ Product found:`);
      console.log(`      - Brand: ${product.brandName || 'N/A'}`);
      console.log(`      - Product: ${product.fullName || 'N/A'}`);
      console.log(`      - UPC: ${product.upcSku || 'N/A'}`);
      console.log(`      - Serving size: ${product.servingSizes?.[0]?.unit || 'N/A'}`);
      console.log(`      - Ingredients: ${product.ingredients?.length || 0}\n`);
      
      if (product.ingredients && product.ingredients.length > 0) {
        console.log(`   📋 First 3 ingredients:`);
        product.ingredients.slice(0, 3).forEach((ing, i) => {
          console.log(`      ${i + 1}. ${ing.name} - ${ing.quantity || '?'}${ing.unit || ''}`);
        });
        console.log();
      }
    } else {
      console.log(`   ⚠️  Product not found\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Get product failed: ${error.message}\n`);
  }
  
  // Test 4: Search by UPC (if we have one)
  console.log('4️⃣ Testing UPC search (example barcode: "036070609061")...');
  try {
    const product = await getDSLDProductByUPC('036070609061');
    
    if (product) {
      console.log(`   ✅ Product found by UPC:`);
      console.log(`      - Brand: ${product.brandName || 'N/A'}`);
      console.log(`      - Product: ${product.fullName || 'N/A'}`);
      console.log(`      - UPC: ${product.upcSku || 'N/A'}\n`);
    } else {
      console.log(`   ⚠️  No product found for this UPC\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ UPC search failed: ${error.message}\n`);
  }
  
  // Test 5: Search for common supplement
  console.log('5️⃣ Testing search for "Vitamin D3"...');
  try {
    const results = await searchDSLD('Vitamin D3');
    console.log(`   ✅ Found ${results.total_results} Vitamin D3 products`);
    
    if (results.products.length > 0) {
      console.log(`   📦 First 3 results:`);
      results.products.slice(0, 3).forEach((prod, i) => {
        console.log(`      ${i + 1}. ${prod.brandName || 'Unknown'} - ${prod.fullName || 'Unknown'}`);
      });
      console.log();
    }
  } catch (error: any) {
    console.error(`   ❌ Search failed: ${error.message}\n`);
  }
  
  console.log('🎉 DSLD API testing complete!\n');
  console.log('📊 Summary:');
  console.log('   - API Base URL: https://api.ods.od.nih.gov/dsld/v9/');
  console.log('   - Rate Limit: 1,000 requests/hour (no key required)');
  console.log('   - License: Public domain (CC0)');
  console.log('   - Coverage: 212,642+ supplement labels');
}

// Run tests
testDSLD().catch(console.error);
