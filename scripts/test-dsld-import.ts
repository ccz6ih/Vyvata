import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testDSLDImport() {
  console.log('🔍 Testing DSLD API and import process...\n');

  // Test 1: DSLD API connectivity
  console.log('Test 1: DSLD API Search');
  console.log('━'.repeat(60));
  try {
    const searchUrl = 'https://api.ods.od.nih.gov/dsld/v9/search-filter?q=magnesium+glycinate';
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
        'Accept': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      console.error(`❌ DSLD API returned ${searchResponse.status}`);
      return;
    }

    const searchData = await searchResponse.json();
    const resultsCount = searchData.stats?.count || 0;
    const hits = searchData.hits || [];

    console.log(`✅ DSLD API working: ${resultsCount.toLocaleString()} total results`);
    console.log(`   First 5 products:`);
    hits.slice(0, 5).forEach((hit: any, i: number) => {
      console.log(`   ${i + 1}. ${hit._source.brandName} - ${hit._source.fullName}`);
    });
    console.log('');

    // Test 2: Get full product details for first result
    if (hits.length > 0) {
      console.log('Test 2: DSLD Product Details');
      console.log('━'.repeat(60));
      const productId = hits[0]._id;
      const labelUrl = `https://api.ods.od.nih.gov/dsld/v9/label/${productId}`;
      
      const labelResponse = await fetch(labelUrl, {
        headers: {
          'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
          'Accept': 'application/json'
        }
      });

      if (labelResponse.ok) {
        const labelData = await labelResponse.json();
        console.log(`✅ Full product data retrieved`);
        console.log(`   Brand: ${labelData.brandName}`);
        console.log(`   Product: ${labelData.fullName}`);
        console.log(`   Ingredients: ${labelData.ingredientRows?.length || 0}`);
        console.log(`   Serving size: ${labelData.servingSizes?.[0]?.minQuantity} ${labelData.servingSizes?.[0]?.unit || 'N/A'}`);
        console.log('');
      } else {
        console.error(`❌ Failed to get product details: ${labelResponse.status}`);
      }
    }

    // Test 3: Check current database state
    console.log('Test 3: Current Database State');
    console.log('━'.repeat(60));
    
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: withIngredients } = await supabase
      .from('product_ingredients')
      .select('product_id', { count: 'exact', head: true });

    const { data: productSample } = await supabase
      .from('products')
      .select('id, brand, name')
      .limit(5);

    console.log(`📊 Total products: ${productCount}`);
    console.log(`📊 Products with ingredients: ${new Set(await supabase.from('product_ingredients').select('product_id').then(r => r.data?.map(i => i.product_id) || [])).size}`);
    console.log(`📊 Sample products in DB:`);
    productSample?.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.brand} - ${p.name}`);
    });
    console.log('');

    // Test 4: Check for duplicate prevention
    console.log('Test 4: Duplicate Detection Test');
    console.log('━'.repeat(60));
    
    if (productSample && productSample.length > 0) {
      const testProduct = productSample[0];
      const { data: duplicateCheck } = await supabase
        .from('products')
        .select('id')
        .eq('brand', testProduct.brand)
        .eq('name', testProduct.name)
        .single();

      if (duplicateCheck) {
        console.log(`✅ Duplicate detection working`);
        console.log(`   Found existing: ${testProduct.brand} - ${testProduct.name}`);
      }
    }
    console.log('');

    // Test 5: Check if preferred brands exist
    console.log('Test 5: Preferred Brands Coverage');
    console.log('━'.repeat(60));
    const preferredBrands = [
      'Thorne', 'Life Extension', 'Pure Encapsulations', 'NOW Foods',
      'Jarrow Formulas', 'Nordic Naturals', 'Doctor\'s Best', 'Garden of Life',
    ];

    for (const brand of preferredBrands) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .ilike('brand', brand);

      console.log(`   ${brand}: ${count || 0} products`);
    }
    console.log('');

    // Test 6: Try a test import (dry run - don't actually insert)
    console.log('Test 6: Test Import Simulation (Dry Run)');
    console.log('━'.repeat(60));
    
    const testBrand = hits[0]._source.brandName;
    const testName = hits[0]._source.fullName;
    
    const { data: wouldBeDuplicate } = await supabase
      .from('products')
      .select('id')
      .eq('brand', testBrand)
      .eq('name', testName)
      .single();

    if (wouldBeDuplicate) {
      console.log(`⚠️  First DSLD result "${testBrand} - ${testName}" already exists in DB`);
      console.log(`   This would be skipped as duplicate`);
    } else {
      console.log(`✅ First DSLD result "${testBrand} - ${testName}" would be imported`);
    }
    console.log('');

    // Test 7: Check for import errors
    console.log('Test 7: Database Constraints Check');
    console.log('━'.repeat(60));
    
    // Check if products table has any constraints that might block inserts
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error(`❌ Error querying products table: ${schemaError.message}`);
      console.error(`   Code: ${schemaError.code}`);
      console.error(`   Details: ${schemaError.details}`);
    } else {
      console.log(`✅ Products table is accessible and queryable`);
    }

    // Check for manufacturer_id constraint issues
    const { data: productsWithoutMfg } = await supabase
      .from('products')
      .select('id, brand, name, manufacturer_id')
      .is('manufacturer_id', null)
      .limit(5);

    if (productsWithoutMfg && productsWithoutMfg.length > 0) {
      console.log(`⚠️  ${productsWithoutMfg.length}+ products have NULL manufacturer_id (this is OK if not required)`);
    } else {
      console.log(`✅ All products have manufacturer_id set`);
    }
    console.log('');

    // Summary
    console.log('━'.repeat(60));
    console.log('Summary:');
    console.log('━'.repeat(60));
    console.log(`DSLD API Status: ✅ Working (${resultsCount.toLocaleString()} products available)`);
    console.log(`Database Status: ${productCount ? '✅' : '❌'} ${productCount} products currently stored`);
    console.log(`Import Pipeline: Testing needed - run quick-import to verify`);
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. If DSLD API works but imports return 0, products are likely duplicates');
    console.log('   2. Try different search terms or categories');
    console.log('   3. Consider cleanup-empty-products if many have no ingredients');
    console.log('   4. Check Vercel logs for actual import errors in production');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDSLDImport().catch(console.error);
