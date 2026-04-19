import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function updateSyncedAt() {
  console.log('🔄 Updating synced_at timestamps...\n');

  const now = new Date().toISOString();

  const { data, error, count } = await supabase
    .from('manufacturer_certifications')
    .update({ synced_at: now })
    .is('synced_at', null)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Updated synced_at for ${count} certifications`);
  console.log(`   Timestamp: ${now}\n`);

  // Verify
  const { count: totalCount } = await supabase
    .from('manufacturer_certifications')
    .select('*', { count: 'exact', head: true });

  const { count: syncedCount } = await supabase
    .from('manufacturer_certifications')
    .select('*', { count: 'exact', head: true })
    .not('synced_at', 'is', null);

  console.log(`📊 Total certifications: ${totalCount}`);
  console.log(`📊 With synced_at: ${syncedCount}`);
}

updateSyncedAt().catch(console.error);
