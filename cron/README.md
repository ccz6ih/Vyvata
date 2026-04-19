# Vyvata Cron Tasks

This directory contains scheduled tasks for automated data management.

## 📅 Schedule Overview

| Task | Frequency | Purpose | Rate Limit Impact |
|------|-----------|---------|-------------------|
| `refresh-active-products.ts` | Daily @ 2 AM | Refresh DSLD data for products in our DB | ~100 requests/day |
| `cleanup-cache.ts` | Daily @ 3 AM | Mark expired cache entries as stale | 0 (internal DB only) |
| `auto-import-products.ts` | Weekly Sunday @ 1 AM | Discover new popular products | ~50-200 requests/week |
| `sync-certifications.ts` | Weekly Monday @ 4 AM | Update NSF/USP certifications | ~50 requests/week |

**Total API Load:** ~150 requests/day average (well under 1,000/hr free tier)

## 🔑 API Key Setup

**Highly Recommended:** Register for a free API key at https://api.data.gov

Benefits:
- 10x higher rate limit (10,000 req/hr vs 1,000 req/hr)
- Identifies you as legitimate integrator
- Get warnings before bans
- Better error messages

Add to `.env.local`:
```
NEXT_PUBLIC_DSLD_API_KEY=your_api_key_here
```

## 🚀 Running Tasks

### Manual Execution
```bash
# Refresh active products
npx tsx cron/refresh-active-products.ts

# Cleanup expired cache
npx tsx cron/cleanup-cache.ts

# Weekly auto-import
npx tsx cron/auto-import-products.ts --limit 50
```

### Automated Scheduling

#### Option 1: Vercel Cron (Recommended for Production)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-active-products",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup-cache",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/auto-import",
      "schedule": "0 1 * * 0"
    }
  ]
}
```

#### Option 2: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily @ 2:00 AM
4. Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\Program Files\nodejs\node_modules\tsx\dist\cli.mjs C:\Projects\Vyvata\cron\refresh-active-products.ts`
   - Start in: `C:\Projects\Vyvata`

#### Option 3: Linux Cron

Add to crontab (`crontab -e`):
```bash
# Daily @ 2 AM - Refresh active products
0 2 * * * cd /path/to/vyvata && npx tsx cron/refresh-active-products.ts

# Daily @ 3 AM - Cleanup cache
0 3 * * * cd /path/to/vyvata && npx tsx cron/cleanup-cache.ts

# Weekly Sunday @ 1 AM - Auto-import new products
0 1 * * 0 cd /path/to/vyvata && npx tsx cron/auto-import-products.ts --limit 50
```

## 📊 Monitoring

### Check Cache Stats
```bash
npx tsx scripts/check-cache-stats.ts
```

Shows:
- Total cache entries
- Hit rate
- Most popular products
- Stale entries needing refresh
- API call savings

### Logs
All cron tasks log to `logs/cron-YYYY-MM-DD.log`:
```bash
# View today's logs
cat logs/cron-$(date +%Y-%m-%d).log

# Watch live
tail -f logs/cron-$(date +%Y-%m-%d).log
```

## 🛡️ Best Practices

### ✅ What We Do Right
1. **Aggressive Caching**: All API responses cached in Supabase with TTLs
2. **Demand-Driven**: Import popular products first, not entire 212k DSLD database
3. **Rate Limit Respect**: Exponential backoff on 429/503 errors
4. **API Key Usage**: Registers as legitimate integrator
5. **Attribution**: All DSLD data includes "Source: NIH ODS" attribution
6. **Stale > Nothing**: Serve stale cache (within 2x TTL) rather than fail

### ❌ What We Avoid
1. **Aggressive Scraping**: No concurrent batch requests without delays
2. **Database Mirroring**: Not pulling all 212k DSLD products upfront
3. **Unattributed Data**: Always credit "Source: NIH ODS"
4. **Retry Storms**: Exponential backoff prevents hammering on errors
5. **Ignoring robots.txt**: Even on gov sites, we respect it

## 🔧 Configuration

Edit `cron/config.ts`:
```typescript
export const CRON_CONFIG = {
  // Refresh strategy
  activeProductRefreshHours: 24,      // Daily for products in our DB
  referenceDataRefreshDays: 90,       // Quarterly for static data
  maxStaleMultiplier: 2,              // Serve stale up to 2x TTL
  
  // Rate limiting
  requestsPerBatch: 10,               // Concurrent requests
  batchDelayMs: 5000,                 // Wait between batches
  maxRetriesOn429: 5,                 // Backoff attempts
  
  // Auto-import limits
  weeklyImportLimit: 50,              // New products per week
  categoryRotation: true,             // Rotate categories weekly
  minVSFScore: 60,                    // Skip low-quality products
};
```

## 📈 Scaling Considerations

Current load: ~150 requests/day average

If you reach 1,000 requests/hour (free tier limit):
1. ✅ Get API key (10,000 req/hr)
2. ✅ Increase cache TTLs (30d for active, 180d for reference)
3. ✅ Batch imports more conservatively (10 products/week)
4. ✅ Add request queue with rate limiting
5. ❌ Don't: Try to scrape entire DSLD database

## 🆘 Troubleshooting

**"Rate limit exceeded"**
→ Check if API key is configured
→ Increase delays between batches
→ Reduce concurrent requests

**"Cache hit rate too low"**
→ Increase TTLs for reference data
→ Pre-warm cache for popular products
→ Check if cache table is being cleared

**"Stale data serving"**
→ This is intentional! Better stale than down
→ Background refresh will update within 24h
→ Adjust `maxStaleMultiplier` if needed

## 📞 Support

- DSLD API Docs: https://dsld.od.nih.gov/api-guide
- api.data.gov Registration: https://api.data.gov/signup
- Report API issues: DSLD@nih.gov
