/**
 * Check what certifications exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkCertifications() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Querying certifications table...\n');

  // Get total count
  const { count: total, error: countError } = await supabase
    .from('certifications')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting certifications:', countError);
    return;
  }

  console.log(`Total certifications: ${total}\n`);

  // Get breakdown by type
  const { data: certs, error: fetchError } = await supabase
    .from('certifications')
    .select('type, verified, product_id')
    .limit(100);

  if (fetchError) {
    console.error('Error fetching certifications:', fetchError);
    return;
  }

  if (!certs || certs.length === 0) {
    console.log('No certifications found');
    return;
  }

  // Group by type
  const byType = certs.reduce((acc, cert) => {
    acc[cert.type] = (acc[cert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Certifications by type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Show some examples
  console.log('\nSample certifications:');
  certs.slice(0, 5).forEach(cert => {
    console.log(`  ${cert.type} - Product: ${cert.product_id.substring(0, 8)}... (verified: ${cert.verified})`);
  });

  // Check if NSF Sport certifications exist
  const { data: nsfCerts } = await supabase
    .from('certifications')
    .select('product_id, type')
    .eq('type', 'nsf_sport')
    .limit(10);

  if (nsfCerts && nsfCerts.length > 0) {
    console.log(`\n✓ Found ${nsfCerts.length} NSF Sport certifications`);
    
    // Get product details for these certifications
    const productIds = nsfCerts.map(c => c.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, brand, name')
      .in('id', productIds);

    if (products) {
      console.log('\nNSF Sport certified products:');
      products.forEach(p => {
        console.log(`  - ${p.brand} ${p.name}`);
      });
    }
  } else {
    console.log('\n✗ No NSF Sport certifications found in database');
  }
}

checkCertifications().catch(console.error);
