import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Seed manufacturer_certifications table based on known brand certifications
 */
async function seedManufacturerCertifications() {
  console.log('🏭 Seeding manufacturer certifications...\n');

  // Get all manufacturers with certification flags
  const { data: manufacturers, error: fetchError } = await supabase
    .from('manufacturers')
    .select('id, name, gmp_certified, fda_registered, third_party_tested, nsf_gmp_url, website');

  if (fetchError) {
    console.error('❌ Error fetching manufacturers:', fetchError);
    return;
  }

  if (!manufacturers || manufacturers.length === 0) {
    console.log('⚠️ No manufacturers found. Run /api/admin/manufacturers/seed-certifications first.');
    return;
  }

  console.log(`📊 Found ${manufacturers.length} manufacturers\n`);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const mfg of manufacturers) {
    console.log(`Processing: ${mfg.name}`);

    // Build certifications array based on flags
    const certs: Array<{
      manufacturer_id: string;
      certification_type: string;
      is_verified: boolean;
      verified_at: string;
      issuing_body: string;
      evidence_url: string | null;
    }> = [];

    if (mfg.gmp_certified) {
      certs.push({
        manufacturer_id: mfg.id,
        certification_type: 'cgmp',
        is_verified: true,
        verified_at: new Date().toISOString(),
        issuing_body: 'FDA',
        evidence_url: mfg.website,
      });
    }

    if (mfg.fda_registered) {
      certs.push({
        manufacturer_id: mfg.id,
        certification_type: 'fda_registered',
        is_verified: true,
        verified_at: new Date().toISOString(),
        issuing_body: 'FDA',
        evidence_url: mfg.website,
      });
    }

    if (mfg.third_party_tested) {
      certs.push({
        manufacturer_id: mfg.id,
        certification_type: 'third_party_tested',
        is_verified: true,
        verified_at: new Date().toISOString(),
        issuing_body: 'Various',
        evidence_url: mfg.website,
      });
    }

    // NSF GMP is special - only if they have the URL
    if (mfg.nsf_gmp_url) {
      certs.push({
        manufacturer_id: mfg.id,
        certification_type: 'nsf_gmp',
        is_verified: true,
        verified_at: new Date().toISOString(),
        issuing_body: 'NSF International',
        evidence_url: mfg.nsf_gmp_url,
      });
    }

    if (certs.length === 0) {
      console.log(`  ⊝ No certifications for ${mfg.name}`);
      skipped++;
      continue;
    }

    // Insert certifications (upsert to handle re-runs)
    for (const cert of certs) {
      try {
        const { error: upsertError } = await supabase
          .from('manufacturer_certifications')
          .upsert(cert, {
            onConflict: 'manufacturer_id,certification_type',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`  ✗ Error inserting ${cert.certification_type}:`, upsertError);
          errors.push(`${mfg.name} - ${cert.certification_type}: ${upsertError.message}`);
        } else {
          console.log(`  ✓ ${cert.certification_type}`);
          inserted++;
        }
      } catch (error) {
        console.error(`  ✗ Exception:`, error);
        errors.push(`${mfg.name} - ${cert.certification_type}: ${error}`);
      }
    }

    console.log('');
  }

  console.log('━'.repeat(80));
  console.log('✅ Seeding complete!');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\n❌ Error details:');
    errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('━'.repeat(80));

  // Verify results
  const { data: verifyData, count } = await supabase
    .from('manufacturer_certifications')
    .select('*', { count: 'exact' });

  console.log(`\n📊 Final count: ${count} manufacturer certifications`);
  
  if (verifyData && verifyData.length > 0) {
    console.log('\nSample certifications:');
    verifyData.slice(0, 10).forEach(c => {
      console.log(`  - ${c.certification_type} (Manufacturer: ${c.manufacturer_id.substring(0, 8)}...)`);
    });
  }
}

seedManufacturerCertifications().catch(console.error);
