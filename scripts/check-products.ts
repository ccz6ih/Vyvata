/**
 * Check import results
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
  // Count by category
  const { data: byCategory } = await supabase
    .from('products')
    .select('category')
    .eq('status', 'active');
  
  if (byCategory) {
    const counts: Record<string, number> = {};
    byCategory.forEach((p: any) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    
    console.log('\n📊 Products by Category:\n');
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });
    
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`\n   ✅ Total: ${total} products\n`);
  }
  
  // Recent imports
  const { data: recent } = await supabase
    .from('products')
    .select('brand, name, category, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (recent) {
    console.log('🆕 Recently Added:\n');
    recent.forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. ${p.brand} ${p.name} (${p.category})`);
    });
    console.log('');
  }
}

checkStats();
