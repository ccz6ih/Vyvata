/**
 * Daily Cleanup: Expired Cache
 * 
 * Marks expired cache entries as needing refresh.
 * Doesn't delete (keeps for analytics), just flags as stale.
 * 
 * Runs daily @ 3 AM
 * Rate limit impact: 0 (internal DB operations only)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

const logs: LogEntry[] = [];

function log(level: LogEntry['level'], message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
  logs.push(entry);
  console.log(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
}

async function saveLogs() {
  const logDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `cron-${new Date().toISOString().split('T')[0]}.log`);
  const logContent = logs.map(l => 
    `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.data ? ' ' + JSON.stringify(l.data) : ''}`
  ).join('\n') + '\n';
  
  fs.appendFileSync(logFile, logContent);
}

async function cleanupCache() {
  log('info', '🧹 Starting cache cleanup');
  
  try {
    // Call cleanup function
    const { error } = await supabase.rpc('cleanup_expired_dsld_cache');
    
    if (error) {
      log('error', 'Cleanup failed', { error: error.message });
      throw error;
    }
    
    // Get stats
    const { data: stats } = await supabase
      .from('dsld_cache')
      .select('needs_refresh')
      .eq('needs_refresh', true);
    
    const staleCount = stats?.length || 0;
    
    log('info', '✅ Cache cleanup complete', {
      staleEntries: staleCount,
    });
    
    // Get cache stats
    const { data: cacheStats } = await supabase
      .from('dsld_cache')
      .select('id, hit_count, is_active_product');
    
    if (cacheStats) {
      const totalEntries = cacheStats.length;
      const activeProducts = cacheStats.filter(c => c.is_active_product).length;
      const totalHits = cacheStats.reduce((sum, c) => sum + (c.hit_count || 0), 0);
      
      log('info', '📊 Cache Statistics', {
        totalEntries,
        activeProducts,
        referenceData: totalEntries - activeProducts,
        totalHits,
        avgHitsPerEntry: (totalHits / totalEntries).toFixed(2),
      });
    }
    
  } catch (error: any) {
    log('error', 'Fatal error during cleanup', { error: error.message });
    throw error;
  } finally {
    await saveLogs();
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupCache()
    .then(() => {
      log('info', '🎉 Cron task completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      log('error', '💥 Cron task failed', { error: error.message });
      process.exit(1);
    });
}

export { cleanupCache };
