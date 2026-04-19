# Adding Products to Vyvata

## 3 Ways to Add Products

### 1️⃣ Via TypeScript Script (Recommended)

Edit `scripts/add-products.ts` and add products to the `PRODUCTS_TO_ADD` array:

```typescript
{
  brand: 'Pure Encapsulations',
  name: 'Magnesium Glycinate',
  category: 'magnesium',
  serving_size: '2 capsules',
  servings_per_container: 90,
  price_usd: 26.40,
  ingredients: [
    {
      ingredient_name: 'Magnesium',
      dose: 120,
      unit: 'mg',
      form: 'glycinate',
      bioavailability: 'high',
      display_order: 1,
    }
  ],
  certifications: [
    { type: 'nsf_gmp', verified: true }
  ]
}
```

Then run:
```bash
npx tsx scripts/add-products.ts
```

**Pros:**
- Type-safe with autocomplete
- Auto-scores products (VSF integrity scores)
- Can validate before import
- Easy to version control

---

### 2️⃣ Via JSON File (Bulk Import)

Create a JSON file (see `scripts/add-products-simple.json` for template):

```json
{
  "products": [
    {
      "brand": "Garden of Life",
      "name": "Vitamin Code Men",
      "category": "multivitamin",
      "ingredients": [...],
      "certifications": [...]
    }
  ]
}
```

Import via curl:
```bash
curl -X POST http://localhost:3000/api/admin/products/import \
  -H "Content-Type: application/json" \
  -d @scripts/add-products-simple.json
```

**Pros:**
- Easy to export/import
- Can be generated programmatically
- Works with external tools

---

### 3️⃣ Via DSLD API (Auto-Enrichment)

For products in the NIH DSLD database, import by UPC or brand+name:

**Coming Soon:** Add this to `scripts/add-products.ts`:
```typescript
async function importFromDSLD(upc: string) {
  const dsldProduct = await getDSLDProductByUPC(upc);
  
  // Convert DSLD format to Vyvata format
  const vyvataProduct = {
    brand: dsldProduct.brandName,
    name: dsldProduct.fullName,
    category: inferCategory(dsldProduct),
    ingredients: dsldProduct.ingredients.map(ing => ({
      ingredient_name: ing.name,
      dose: ing.quantity,
      unit: ing.unit,
      form: ing.ingredientForm,
      bioavailability: inferBioavailability(ing),
    })),
    // ... rest of fields
  };
  
  // Import via API
  await fetch(`${API_URL}/api/admin/products/import`, {
    method: 'POST',
    body: JSON.stringify({ products: [vyvataProduct], score: true })
  });
}
```

**Pros:**
- No manual data entry
- Official NIH data
- Verified ingredient lists

---

## Product Schema Reference

### Required Fields
```typescript
{
  brand: string,              // e.g., "Thorne", "NOW Foods"
  name: string,               // e.g., "Magnesium Bisglycinate"
  category: string,           // e.g., "magnesium", "omega-3", "multivitamin"
}
```

### Optional Fields
```typescript
{
  product_url?: string,       // Link to manufacturer page
  image_url?: string,         // Product image
  serving_size?: string,      // e.g., "2 capsules", "1 scoop"
  servings_per_container?: number,
  price_usd?: number,         // Automatically calculates price_per_serving
  status?: "active" | "discontinued" | "pending_review",
  
  manufacturer?: {
    name: string,
    website?: string,
    country?: string,
    gmp_certified?: boolean,
    fda_registered?: boolean,
    third_party_tested?: boolean,
  },
  
  ingredients: [{
    ingredient_name: string,      // Must match ingredients database
    dose: number,
    unit: string,                 // mg, mcg, g, IU, etc.
    form?: string,                // e.g., "bisglycinate", "D3", "methylcobalamin"
    bioavailability?: "high" | "medium" | "low",
    daily_value_percentage?: number,
    is_proprietary_blend?: boolean,
    display_order?: number,
  }],
  
  certifications: [{
    type: "nsf_sport" | "nsf_gmp" | "usp_verified" | "informed_sport" | 
          "informed_choice" | "non_gmo" | "organic_usda" | "vegan" | 
          "gluten_free" | "kosher" | "halal",
    verified?: boolean,
    verification_url?: string,
    certificate_number?: string,
    issued_date?: string,         // ISO date
    expiration_date?: string,     // ISO date
  }]
}
```

---

## VSF Scoring

Products are automatically scored on import when `score: true` is passed:

**Integrity Score Formula:**
- **Formulation (70%)**: Bioavailability of ingredient forms
  - High bioavailability: glycinate, citrate, methylcobalamin, D3, etc.
  - Low bioavailability: oxide, cyanocobalamin, D2, etc.
  
- **Transparency (20%)**: No proprietary blends
  
- **Certifications (10%)**: NSF Sport, USP Verified, etc.

**Tier Classification:**
- **Elite** (90-100): Premium formulation, verified certs
- **Verified** (80-89): High bioavailability, transparent
- **Standard** (60-79): Adequate but room for improvement
- **Rejected** (<60): Low bioavailability or proprietary blends

---

## Tips for Adding Products

### 1. Match Existing Categories
Check `scripts/add-products.ts` for existing categories:
- magnesium, vitamin d, omega-3, b-complex, probiotic, creatine, zinc, coq10, curcumin, multivitamin

### 2. Use High-Bioavailability Forms
Prefer these forms for better scores:
- **Magnesium**: bisglycinate, citrate, malate (NOT oxide)
- **Vitamin D**: D3 cholecalciferol (NOT D2)
- **B12**: methylcobalamin (NOT cyanocobalamin)
- **Folate**: methylfolate, 5-MTHF (NOT folic acid)
- **Omega-3**: triglyceride form (NOT ethyl ester)

### 3. Add Certifications
Premium brands often have:
- NSF Sport (athlete-tested)
- NSF GMP (manufacturing quality)
- USP Verified (purity testing)
- Informed Sport (banned substance testing)

### 4. Price Per Serving
The system auto-calculates this from `price_usd` ÷ `servings_per_container`

---

## View & Manage Products

After adding products, view them at:
- **Admin UI**: http://localhost:3000/admin/products
- **Public Products**: http://localhost:3000/products

From the admin panel you can:
- Score/rescore products
- Sync certifications from third-party databases
- View ingredient breakdowns
- Check VSF tier classifications
