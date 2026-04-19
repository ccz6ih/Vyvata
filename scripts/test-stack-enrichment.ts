/**
 * Test DSLD enrichStackFromDSLD function (the killer feature!)
 */

import { enrichStackFromDSLD } from '../src/lib/dsld-api';

async function testEnrichStack() {
  console.log('🧪 Testing DSLD Stack Enrichment...\n');
  console.log('This is the KILLER FEATURE that replaces manual OCR!\n');
  
  // Simulate a receipt OCR result (brand + product name from receipt photo)
  const stackFromReceipt = [
    { brand: 'Thorne', productName: 'Magnesium Bisglycinate' },
    { brand: 'NOW Foods', productName: 'Vitamin D-3' },
    { brand: 'Nature Made', productName: 'Fish Oil', upc: '031604014964' }
  ];
  
  console.log('📝 Input (from receipt OCR):');
  stackFromReceipt.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.brand} ${item.productName}${item.upc ? ' (UPC: ' + item.upc + ')' : ''}`);
  });
  
  console.log('\n🔄 Enriching with DSLD API...\n');
  
  const enrichedProducts = await enrichStackFromDSLD(stackFromReceipt);
  
  console.log('📊 Results:\n');
  
  enrichedProducts.forEach((product, i) => {
    console.log(`${i + 1}. ${stackFromReceipt[i].brand} ${stackFromReceipt[i].productName}`);
    
    if (product) {
      console.log(`   ✅ FOUND in DSLD:`);
      console.log(`      - Full Name: ${product.fullName}`);
      console.log(`      - Brand: ${product.brandName}`);
      console.log(`      - UPC: ${product.upcSku || 'N/A'}`);
      console.log(`      - DSLD ID: ${product.id}`);
      console.log(`      - Ingredients: ${product.ingredients?.length || 0}`);
      
      if (product.ingredients && product.ingredients.length > 0) {
        console.log(`      - First 3 ingredients:`);
        product.ingredients.slice(0, 3).forEach((ing) => {
          const form = ing.ingredientForm ? ` (${ing.ingredientForm})` : '';
          console.log(`         • ${ing.name}: ${ing.quantity || '?'}${ing.unit || ''}${form}`);
        });
      }
    } else {
      console.log(`   ⚠️  NOT FOUND in DSLD`);
    }
    
    console.log();
  });
  
  console.log('🎉 Stack enrichment complete!');
  console.log('\n💡 What we just did:');
  console.log('   - Took brand + product name from receipt photo');
  console.log('   - Automatically looked up structured ingredient data');
  console.log('   - Got exact doses, units, and forms for bioavailability scoring');
  console.log('   - NO MANUAL DATA ENTRY NEEDED!');
}

testEnrichStack().catch(console.error);
