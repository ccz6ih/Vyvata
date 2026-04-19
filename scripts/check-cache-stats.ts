/**
 * Check DSLD Cache Statistics
 * 
 * Shows cache performance, hit rates, and API call savings
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCacheStats() {
  console.log('\n📊 DSLD Cache Statistics\n');
  console.log('─'.repeat(60));
  
  // Overall stats
  const { data: allCache } = await supabase
    .from('dsld_cache')
    .select('id, hit_count, is_active_product, needs_refresh, request_type, fetched_at');
  
  if (!allCache || allCache.length === 0) {
    console.log('\n⚠️  No cache entries found. Run auto-import first.\n');
    return;
  }
  
  const totalEntries = allCache.length;
  const activeProducts = allCache.filter(c => c.is_active_product).length;
  const referenceData = totalEntries - activeProducts;
  const staleEntries = allCache.filter(c => c.needs_refresh).length;
  const totalHits = allCache.reduce((sum, c) => sum + (c.hit_count || 0), 0);
  
  console.log('\n📦 Cache Overview:');
  console.log(`   Total Entries: ${totalEntries}`);
  console.log(`   Active Products: ${activeProducts} (refresh daily)`);
  console.log(`   Reference Data: ${referenceData} (refresh quarterly)`);
  console.log(`   Stale Entries: ${staleEntries}`);
  console.log(`   Total Cache Hits: ${totalHits.toLocaleString()}`);
  console.log(`   Avg Hits/Entry: ${(totalHits / totalEntries).toFixed(2)}`);
  
  // Hit rate (API calls saved)
  const apiCallsSaved = totalHits;
  const apiCallsMade = totalEntries; // Initial fetch for each entry
  const totalRequests = apiCallsMade + apiCallsSaved;
  const cacheHitRate = ((apiCallsSaved / totalRequests) * 100).toFixed(1);
  
  console.log('\n💰 API Call Savings:');
  console.log(`   API Calls Made: ${apiCallsMade}`);
  console.log(`   API Calls Saved: ${apiCallsSaved.toLocaleString()}`);
  console.log(`   Cache Hit Rate: ${cacheHitRate}%`);
  console.log(`   Total Requests Handled: ${totalRequests.toLocaleString()}`);
  
  // Request type breakdown
  const byType: Record<string, number> = {};
  allCache.forEach(c => {
    byType[c.request_type] = (byType[c.request_type] || 0) + 1;
  });
  
  console.log('\n📂 By Request Type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Top 10 most hit cache entries
  const { data: topHits } = await supabase
    .from('dsld_cache')
    .select('product_name, brand_name, hit_count')
    .order('hit_count', { ascending: false })
    .limit(10);
  
  if (topHits && topHits.length > 0) {
    console.log('\n🔥 Top 10 Most Popular Products:');
    topHits.forEach((entry, i) => {
      const name = entry.brand_name && entry.product_name
        ? `${entry.brand_name} ${entry.product_name}`
        : '(search result)';
      console.log(`   ${i + 1}. ${name} (${entry.hit_count} hits)`);
    });
  }
  
  // Freshness
  const now = Date.now();
  const fresh = allCache.filter(c => {
    const age = now - new Date(c.fetched_at).getTime();
    return age < 24 * 60 * 60 * 1000; // Less than 24h old
  }).length;
  
  const week = allCache.filter(c => {
    const age = now - new Date(c.fetched_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000; // Less than 7d old
  }).length;
  
  console.log('\n⏰ Data Freshness:');
  console.log(`   < 24 hours: ${fresh} (${((fresh / totalEntries) * 100).toFixed(1)}%)`);
  console.log(`   < 7 days: ${week} (${((week / totalEntries) * 100).toFixed(1)}%)`);
  console.log(`   Needs Refresh: ${staleEntries} (${((staleEntries / totalEntries) * 100).toFixed(1)}%)`);
  
  console.log('\n' + '─'.repeat(60) + '\n');
}

checkCacheStats();
