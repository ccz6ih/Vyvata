/**
 * Debug DSLD API raw responses
 */

async function debugDSLD() {
  console.log('🔍 Debugging DSLD API raw responses...\n');
  
  // Test search endpoint
  console.log('1️⃣ Testing search endpoint:');
  const searchUrl = 'https://api.ods.od.nih.gov/dsld/v9/search-filter?q=magnesium';
  console.log(`   URL: ${searchUrl}`);
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
        'Accept': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`   Response length: ${text.length} bytes`);
    
    try {
      const data = JSON.parse(text);
      console.log(`   Response structure:`, Object.keys(data));
      
      if (data.hits) {
        console.log(`   hits structure:`, Object.keys(data.hits));
        console.log(`   hits.total:`, data.hits.total);
        console.log(`   hits.hits length:`, data.hits.hits?.length || 0);
        
        if (data.hits.hits && data.hits.hits.length > 0) {
          const first = data.hits.hits[0];
          console.log(`   First hit keys:`, Object.keys(first));
          console.log(`   First hit._source keys:`, Object.keys(first._source));
          console.log(`   First product:`, {
            id: first._id,
            brand: first._source.brandName,
            name: first._source.fullName
          });
        }
      }
    } catch (e: any) {
      console.log(`   ❌ JSON parse error: ${e.message}`);
      console.log(`   Raw response:`, text.substring(0, 500));
    }
    
  } catch (error: any) {
    console.error(`   ❌ Request failed: ${error.message}`);
  }
  
  console.log('\n2️⃣ Testing label endpoint:');
  const labelUrl = 'https://api.ods.od.nih.gov/dsld/v9/label/82118';
  console.log(`   URL: ${labelUrl}`);
  
  try {
    const response = await fetch(labelUrl, {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
        'Accept': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    const data = await response.json();
    console.log(`   Response keys:`, Object.keys(data));
    console.log(`   Product:`, {
      id: data.id,
      brand: data.brandName,
      name: data.fullName,
      upc: data.upcSku
    });
    
  } catch (error: any) {
    console.error(`   ❌ Request failed: ${error.message}`);
  }
}

debugDSLD().catch(console.error);
