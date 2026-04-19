# Product Management Scripts

Scripts for adding and managing products in the Vyvata database.

## 🤖 Automated Import (Recommended)

### Auto-Discovery Agent - Zero Manual Work
**Automatically discovers and imports products from DSLD database with VSF scoring.**

```bash
# Auto-import products (discovers from DSLD)
npx tsx scripts/auto-import-products.ts

# Import specific categories
npx tsx scripts/auto-import-products.ts --categories magnesium,omega-3,vitamin-d

# Preview without importing
npx tsx scripts/auto-import-products.ts --dry-run --limit 20
```

**What it does:**
- ✅ Discovers popular products from 212k+ DSLD products
- ✅ Auto-infers bioavailability (high: glycinate/citrate/D3, low: oxide/carbonate)
- ✅ Auto-calculates VSF integrity scores (formulation + transparency + certs)
- ✅ Imports with full metadata
- ✅ Groups by tier (Elite 90+, Verified 80+, Standard 60+)

**See:** `.agents/product-auto-import-agent.md` for full documentation

---

## Quick Start (Manual Methods)

### Add Products Manually
```bash
# Edit scripts/add-products.ts with your products
npx tsx scripts/add-products.ts
```

### Import from DSLD (NIH Database)
```bash
# Edit scripts/import-from-dsld.ts with brand + product names
npx tsx scripts/import-from-dsld.ts
```

### Bulk Import from JSON
```bash
# Edit scripts/add-products-simple.json
curl -X POST http://localhost:3000/api/admin/products/import \
  -H "Content-Type: application/json" \
  -d @scripts/add-products-simple.json
```

## Scripts Overview

### `add-products.ts` - Manual Product Entry
Type-safe product definitions with full control over all fields.

**Best for:**
- Adding products with custom pricing
- Specifying exact bioavailability ratings
- Products not in DSLD database
- Fine-grained control over certifications

**Example:**
```typescript
{
  brand: 'Pure Encapsulations',
  name: 'Magnesium Glycinate',
  category: 'magnesium',
  price_usd: 26.40,
  ingredients: [...]
}
```

### `import-from-dsld.ts` - Automatic DSLD Import
Fetches products from the NIH DSLD database and auto-enriches ingredient data.

**Best for:**
- Quick imports of major brands
- Verified ingredient lists from official source
- Products sold in US market with UPC codes
- Automatic ingredient form detection

**Example:**
```typescript
{ brand: 'Garden of Life', productName: 'Vitamin Code Raw D3' }
```

### `add-products-simple.json` - JSON Bulk Import
Simple JSON format for bulk imports or external tool integration.

**Best for:**
- Migrating from other systems
- Programmatic generation
- Large batch imports
- CI/CD pipelines

## Product Schema

See [docs/ADD_PRODUCTS.md](../docs/ADD_PRODUCTS.md) for complete schema documentation.

### Minimal Product
```json
{
  "brand": "Thorne",
  "name": "Magnesium Bisglycinate",
  "category": "magnesium",
  "ingredients": [
    {
      "ingredient_name": "Magnesium",
      "dose": 200,
      "unit": "mg"
    }
  ]
}
```

### Full Product Example
```json
{
  "brand": "Thorne",
  "name": "Magnesium Bisglycinate",
  "category": "magnesium",
  "serving_size": "1 capsule",
  "servings_per_container": 90,
  "price_usd": 22.00,
  "product_url": "https://thorne.com/...",
  "manufacturer": {
    "name": "Thorne Research",
    "website": "https://thorne.com",
    "gmp_certified": true
  },
  "ingredients": [
    {
      "ingredient_name": "Magnesium",
      "dose": 200,
      "unit": "mg",
      "form": "bisglycinate",
      "bioavailability": "high",
      "display_order": 1
    }
  ],
  "certifications": [
    {
      "type": "nsf_sport",
      "verified": true
    }
  ]
}
```

## Bioavailability Guidelines

### High Bioavailability Forms
- **Magnesium**: bisglycinate, citrate, malate, threonate
- **Vitamin D**: D3 (cholecalciferol)
- **B12**: methylcobalamin, adenosylcobalamin
- **Folate**: methylfolate, 5-MTHF
- **Omega-3**: triglyceride form
- **Zinc**: picolinate, orotate

### Low Bioavailability Forms (Avoid)
- **Magnesium**: oxide, carbonate
- **Vitamin D**: D2 (ergocalciferol)
- **B12**: cyanocobalamin
- **Folate**: folic acid
- **Zinc**: oxide, sulfate

## VSF Scoring

Products are automatically scored when imported with `score: true`:

| Tier | Score | Criteria |
|------|-------|----------|
| **Elite** | 90-100 | Premium forms + verified certs |
| **Verified** | 80-89 | High bioavailability + transparent |
| **Standard** | 60-79 | Adequate but room for improvement |
| **Rejected** | <60 | Low bioavailability or proprietary blends |

**Score Breakdown:**
- Formulation (70%): Ingredient form bioavailability
- Transparency (20%): No proprietary blends
- Certifications (10%): NSF Sport, USP Verified, etc.

## View Products

After importing, view your products at:
- **Admin Panel**: http://localhost:3000/admin/products
- **Public View**: http://localhost:3000/products

From admin panel you can:
- Score/rescore products
- Sync certifications
- View ingredient breakdowns
- Export product data
