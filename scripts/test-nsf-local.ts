/**
 * Local NSF Sport diagnostic - test what certifications NSF actually has
 * for our top brands without waiting for deployment
 */

import { NSFSportScraper } from '../src/lib/scrapers/nsf-sport';

const TOP_BRANDS = [
  { brand: 'Thorne', product: 'Magnesium' },
  { brand: 'Pure Encapsulations', product: 'Magnesium' },
  { brand: 'Nordic Naturals', product: 'Omega' },
  { brand: 'Life Extension', product: 'Vitamin' },
  { brand: 'Jarrow Formulas', product: 'Probiotics' },
  { brand: 'NOW Foods', product: 'Vitamin' },
  { brand: 'Garden of Life', product: 'Vitamin' },
  { brand: 'Doctor\'s Best', product: 'Magnesium' },
  { brand: 'Solgar', product: 'Vitamin' },
  { brand: 'Nature\'s Way', product: 'Vitamin' },
];

async function testNSFCoverage() {
  const scraper = new NSFSportScraper();

  console.log('Loading NSF Sport registry...\n');
  const registry = await scraper.loadRegistry();
  console.log(`✓ Loaded ${registry.length} NSF Sport certified products\n`);

  console.log('Testing top brands:\n');
  console.log('='.repeat(80));

  for (const { brand, product } of TOP_BRANDS) {
    console.log(`\n${brand} - ${product}:`);
    
    const matches = await scraper.findMatches(brand, product);
    
    if (matches.length > 0) {
      console.log(`  ✓ Found ${matches.length} exact matches:`);
      matches.slice(0, 3).forEach(m => {
        console.log(`    - ${m.productName}`);
      });
    } else {
      // Check for partial brand matches
      const brandLower = brand.toLowerCase();
      const partialBrandMatches = registry.filter(l => 
        l.brand.toLowerCase().includes(brandLower) ||
        brandLower.includes(l.brand.toLowerCase())
      );

      if (partialBrandMatches.length > 0) {
        console.log(`  ⚠ No exact matches, but found ${partialBrandMatches.length} products from similar brands:`);
        partialBrandMatches.slice(0, 3).forEach(m => {
          console.log(`    - ${m.brand}: ${m.productName}`);
        });
      } else {
        console.log(`  ✗ No matches - brand not in NSF Sport registry`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\nSummary:');
  console.log(`- NSF Sport has ${registry.length} total certified products`);
  console.log(`- Tested ${TOP_BRANDS.length} of our top brands`);
  
  // Show some example brands that ARE in NSF registry
  const popularBrands = registry.reduce((acc, item) => {
    acc[item.brand] = (acc[item.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topNSFBrands = Object.entries(popularBrands)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\nTop 10 brands in NSF Sport registry:');
  topNSFBrands.forEach(([brand, count]) => {
    console.log(`  ${brand}: ${count} products`);
  });
}

testNSFCoverage().catch(console.error);
