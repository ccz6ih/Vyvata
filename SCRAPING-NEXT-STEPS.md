# Certification Scraping - Next Steps

**Created:** April 18, 2026  
**Status:** Infrastructure Complete, Research Needed  
**Priority:** HIGH - Unblocks product scoring

---

## ✅ What's Built

### **Core Infrastructure:**
- ✅ Rate limiter with window-based throttling
- ✅ Base scraper class with retry logic
- ✅ NSF Sport scraper (needs URL research)
- ✅ USP Verified scraper (needs URL research)
- ✅ Informed Sport scraper (needs bot protection bypass)
- ✅ Certification sync orchestrator
- ✅ API endpoint `/api/admin/sync-certifications`

### **Files Created:**
- `src/lib/scrapers/rate-limiter.ts` - Rate limiting with backoff
- `src/lib/scrapers/base-scraper.ts` - Reusable scraper foundation
- `src/lib/scrapers/nsf-sport.ts` - NSF Sport implementation
- `src/lib/scrapers/usp-verified.ts` - USP Verified implementation
- `src/lib/scrapers/informed-sport.ts` - Informed Sport implementation
- `src/lib/scrapers/certification-sync.ts` - Orchestration logic
- `src/app/api/admin/sync-certifications/route.ts` - API endpoint
- `.agents/scraping-research.md` - Research tracker

---

## 🔬 Research Needed (Week 1)

### **Critical Path:**

**1. Find Correct URLs** (Manual navigation required)

```
TASK: Manually navigate to each certification database and document:
- Actual product search URL
- Search mechanism (GET query, POST form, JavaScript)
- HTML structure of results
- Whether results are server-rendered or client-side JS
```

**Where to look:**
- NSF Sport: https://www.nsfsport.com/ → Find "Certified Products" section
- USP Verified: https://www.usp.org/ → Find "Verified Products" or "Dietary Supplements"
- Informed Sport: https://sport.wetestyoutrust.com/ → Test search (may be blocked)

**Document in:** `.agents/scraping-research.md`

---

**2. Test Known Certified Products**

Search for these products manually to verify results exist:

**NSF Sport:**
- Thorne Magnesium Bisglycinate
- Klean Athlete products
- Pure Encapsulations (select products)

**USP Verified:**
- Nature Made Vitamin D3
- Kirkland Signature Multivitamin
- Life Extension products

**Informed Sport:**
- Bulk Powders Whey Protein
- SiS Energy Gel
- Optimum Nutrition Gold Standard

---

**3. Check robots.txt and Terms of Service**

```bash
# Check what's allowed
curl https://www.nsfsport.com/robots.txt
curl https://www.usp.org/robots.txt
curl https://sport.wetestyoutrust.com/robots.txt
```

Look for:
- Disallowed paths
- Crawl-delay requirements
- Contact info for API access

---

**4. Inspect HTML Structure**

For each site:
1. Open browser DevTools (F12)
2. Search for a product manually
3. Inspect the results HTML
4. Note CSS selectors for:
   - Product brand
   - Product name
   - Certification number
   - Issue/expiration dates
5. Check if results use `<table>`, `<div>`, or JavaScript framework
6. Save example HTML snippets

---

## 🛠️ Implementation Steps (Week 2-3)

Once research is complete:

### **Step 1: Update Scraper URLs**

In each scraper file, update:
```typescript
private buildSearchUrl(searchQuery: string): string {
  // Replace with actual working URL
  const encoded = encodeURIComponent(searchQuery);
  return `https://CORRECT_URL?search=${encoded}`;
}
```

### **Step 2: Implement HTML Parsing**

Install cheerio (already done):
```bash
npm install cheerio
```

Update `parseResults()` methods with correct CSS selectors:
```typescript
import * as cheerio from 'cheerio';

private parseResults(html: string, searchQuery: string): CertResult[] {
  const $ = cheerio.load(html);
  const results: CertResult[] = [];
  
  // Use selectors discovered during research
  $('.result-row').each((i, elem) => {
    const brand = $(elem).find('.brand-name').text().trim();
    const productName = $(elem).find('.product-name').text().trim();
    const certNumber = $(elem).find('.cert-id').text().trim();
    
    if (brand && productName) {
      results.push({
        brand,
        productName,
        certificationType: 'nsf_sport',
        certificationNumber: certNumber,
        verificationUrl: searchQuery
      });
    }
  });
  
  return results;
}
```

### **Step 3: Test with Real Products**

```typescript
// Test in Node REPL or create test file
import { nsfSportScraper } from './src/lib/scrapers/nsf-sport';

const result = await nsfSportScraper.scrape('Thorne Magnesium');
console.log(result);
```

---

## 🚀 Alternative Approaches

### **If Scraping is Blocked:**

**Option A: API Partnership (Best)**
- Email NSF: info@nsf.org
- Email USP: verification@usp.org  
- Email Informed Sport: info@informed-sport.com
- Propose: "We're building a supplement standards framework, can we access your verified product list?"

**Option B: Manual CSV Import**
- Download certification lists manually (if available)
- Import to database quarterly
- Less ideal but reliable

**Option C: Browser Automation (Informed Sport)**

If Informed Sport continues blocking:
```bash
npm install puppeteer
```

Then use `scrapeWithBrowser()` method (implementation needed):
```typescript
const result = await informedSportScraper.scrapeWithBrowser('Thorne Magnesium');
```

**Option D: Vendor Portal**
- Build vendor submission portal (Phase 3)
- Vendors upload their own cert documents
- We verify and track in database
- Scales with vendor adoption

---

## 🧪 Testing the Scraping System

### **Manual Test (Single Product):**

```bash
# Start dev server
npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/admin/sync-certifications \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "your-product-uuid",
    "brand": "Thorne",
    "productName": "Magnesium Bisglycinate"
  }'
```

### **Full Sync Test:**

```bash
# Sync all products in database
curl -X POST http://localhost:3000/api/admin/sync-certifications

# Check status
curl http://localhost:3000/api/admin/sync-certifications
```

### **Expected Response:**

```json
{
  "success": true,
  "synced": 5,
  "errors": 0,
  "totalProducts": 10,
  "message": "Synced 5 products, 0 errors",
  "results": [...]
}
```

---

## 📊 Success Metrics

**Week 1 Research Complete:**
- [ ] All 3 certification database URLs documented
- [ ] HTML structure mapped for each site
- [ ] robots.txt reviewed for compliance
- [ ] Test products verified manually

**Week 2-3 Implementation Complete:**
- [ ] NSF Sport scraper returns real results
- [ ] USP Verified scraper returns real results
- [ ] Informed Sport scraper working (or fallback planned)
- [ ] At least 10 products successfully synced
- [ ] Certifications visible in Supabase `certifications` table

**Ready for Production:**
- [ ] 80%+ accuracy on known certified products
- [ ] Rate limiting prevents IP blocks
- [ ] Error handling logs issues without crashing
- [ ] API endpoint protected with admin auth
- [ ] Weekly cron job scheduled (optional for Phase 1)

---

## 🔄 Weekly Sync Setup (Optional)

After scrapers are working, schedule weekly updates:

### **Option 1: Supabase Edge Function + pg_cron**

Already documented in [certification-scraping-agent.md](.agents/certification-scraping-agent.md#task-7-schedule-weekly-sync-supabase-edge-function)

### **Option 2: Vercel Cron**

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sync-certifications",
    "schedule": "0 2 * * 1"
  }]
}
```

### **Option 3: GitHub Actions**

Create `.github/workflows/sync-certifications.yml`:
```yaml
name: Sync Certifications
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2am UTC
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST https://yourdomain.com/api/admin/sync-certifications \
            -H "Authorization: Bearer ${{ secrets.ADMIN_API_KEY }}"
```

---

## 📞 Next Actions

**Immediate (This Week):**
```
1. Manually navigate to NSF Sport and find product search
2. Document URL and HTML structure in scraping-research.md
3. Repeat for USP Verified
4. Test Informed Sport (expect 403, document alternative approaches)
```

**Week 2:**
```
1. Update scraper URLs with correct endpoints
2. Implement HTML parsing with correct selectors
3. Test with 5-10 known certified products
4. Fix any parsing errors
```

**Week 3:**
```
1. Sync all seeded products (from product-abstraction-agent)
2. Verify certifications appear in database
3. Add admin auth to sync endpoint
4. Document final approach for each certification source
```

---

## 🎯 End Goal

**After 3 Weeks:**
- Automated certification tracking for NSF Sport and USP Verified
- Manual or API approach for Informed Sport
- 30+ products with verified certifications
- Weekly sync running (optional)
- **Product scoring can include certification bonuses (+10-18pts)**

**This unblocks:**
- Phase 2 manufacturing dimension scoring
- Tier calculations with certification bonuses
- Product comparison with cert badges
- Public trust in VSF scores

---

**Ready to start research? Begin by manually testing NSF Sport search and documenting findings!** 🔬
