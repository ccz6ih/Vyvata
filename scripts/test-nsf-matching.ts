/**
 * Test why Thorne Magnesium Bisglycinate isn't matching in the sync
 */

import { NSFSportScraper } from '../src/lib/scrapers/nsf-sport';

async function testMatching() {
  const scraper = new NSFSportScraper();

  console.log('Loading NSF registry...\n');
  await scraper.loadRegistry();

  // Test exact match like the sync does
  const brand = 'Thorne';
  const productName = 'Magnesium Bisglycinate';

  console.log(`Testing: ${brand} ${productName}\n`);
  
  const matches = await scraper.findMatches(brand, productName);
  
  console.log(`Found ${matches.length} matches:\n`);
  matches.forEach(m => {
    console.log(`  ✓ ${m.brand} - ${m.productName}`);
    console.log(`    URL: ${m.detailUrl}`);
    console.log(`    ID: ${m.listingId}\n`);
  });

  // Also test the scrape() method used in certification-sync.ts
  console.log('\nTesting scrape() method (used by sync):');
  const scrapeResult = await scraper.scrape(`${brand} ${productName}`);
  
  if (scrapeResult.success && scrapeResult.data) {
    console.log(`  ✓ Scrape found ${scrapeResult.data.length} results`);
    scrapeResult.data.forEach(r => {
      console.log(`    - ${r.brand} ${r.productName}`);
    });
  } else {
    console.log(`  ✗ Scrape failed: ${scrapeResult.error}`);
  }

  // Test Nordic Naturals
  console.log('\n' + '='.repeat(80));
  console.log('\nTesting: Nordic Naturals Super EPA\n');
  
  const nordicMatches = await scraper.findMatches('Nordic Naturals', 'Super EPA');
  console.log(`Found ${nordicMatches.length} matches`);
  nordicMatches.slice(0, 3).forEach(m => {
    console.log(`  - ${m.productName}`);
  });
}

testMatching().catch(console.error);
