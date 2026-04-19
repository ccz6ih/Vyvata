import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function checkManufacturerCerts() {
  console.log('🔍 Checking manufacturer certifications...\n');

  // Check manufacturer_certifications table
  const { data: mfgCerts, error: mfgError, count: mfgCount } = await supabase
    .from('manufacturer_certifications')
    .select('*', { count: 'exact' });

  if (mfgError) {
    console.error('❌ Error querying manufacturer_certifications:', mfgError);
    return;
  }

  console.log(`📊 Total manufacturer certifications: ${mfgCount}`);

  if (mfgCerts && mfgCerts.length > 0) {
    console.log('\nManufacturer certifications found:');
    mfgCerts.forEach((cert, i) => {
      console.log(`  ${i + 1}. Manufacturer ID: ${cert.manufacturer_id}`);
      console.log(`     Type: ${cert.certification_type}`);
      console.log(`     Verified: ${cert.is_verified}`);
      console.log(`     Synced: ${cert.synced_at || 'Never'}`);
      console.log('');
    });
  } else {
    console.log('⚠️ No manufacturer certifications found in database\n');
  }

  // Check manufacturers table
  const { data: manufacturers, count: mfgTableCount } = await supabase
    .from('manufacturers')
    .select('id, name');

  console.log(`📊 Total manufacturers: ${mfgTableCount}`);

  if (manufacturers && manufacturers.length > 0) {
    console.log('\nSample manufacturers:');
    manufacturers.slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (ID: ${m.id})`);
    });
  }

  // Check products table for manufacturer_id
  const { data: productsWithMfg, count: withMfgCount } = await supabase
    .from('products')
    .select('id, manufacturer_id', { count: 'exact' })
    .not('manufacturer_id', 'is', null);

  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Products with manufacturer_id: ${withMfgCount}/${totalProducts}`);

  // Check if manufacturer_certifications table exists
  const { error: tableError } = await supabase
    .from('manufacturer_certifications')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('\n❌ Table access error:', tableError.message);
    console.error('   Code:', tableError.code);
    console.error('   This might indicate the table doesn\'t exist or has RLS blocking access');
  } else {
    console.log('\n✅ manufacturer_certifications table is accessible');
  }
}

checkManufacturerCerts().catch(console.error);
