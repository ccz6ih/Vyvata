/**
 * Debug DSLD search response structure
 */

async function debugSearch() {
  console.log('🔍 Analyzing DSLD search response structure...\n');
  
  const searchUrl = 'https://api.ods.od.nih.gov/dsld/v9/search-filter?q=magnesium';
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  
  console.log('Top-level keys:', Object.keys(data));
  console.log('Type of data.hits:', typeof data.hits);
  console.log('Is data.hits an array?', Array.isArray(data.hits));
  console.log('data.hits length:', data.hits?.length);
  
  if (Array.isArray(data.hits) && data.hits.length > 0) {
    console.log('\n📦 First hit:');
    const first = data.hits[0];
    console.log('Keys:', Object.keys(first));
    console.log('_id:', first._id);
    console.log('_score:', first._score);
    
    if (first._source) {
      console.log('\n_source keys:', Object.keys(first._source));
      console.log('Brand:', first._source.brandName);
      console.log('Product:', first._source.fullName);
      console.log('UPC:', first._source.upcSku);
      console.log('Off Market:', first._source.offMarket);
    }
  }
  
  if (data.stats) {
    console.log('\n📊 Stats:', data.stats);
  }
}

debugSearch().catch(console.error);
