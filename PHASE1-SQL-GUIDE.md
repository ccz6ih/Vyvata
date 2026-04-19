# Phase 1 SQL Migration Guide

**Migration File:** `supabase/migrations/20260418_vsf_phase1_products_and_scoring.sql`  
**Created:** April 18, 2026  
**Purpose:** Database schema for VSF product scoring (Phase 1)

---

## 🗄️ What This Migration Creates

### **5 New Tables**

1. **`manufacturers`** - Brand/manufacturer info (Thorne, Life Extension, NOW Foods, etc.)
2. **`products`** - Supplement products with brand, name, pricing, status
3. **`product_ingredients`** - Junction table linking products to ingredients with doses/forms
4. **`certifications`** - NSF Sport, USP Verified, Informed Sport tracking
5. **`product_scores`** - Score history with dimension breakdowns (Evidence, Safety, Formulation, etc.)

---

## 📦 Database Schema Overview

```
manufacturers
├─ id (uuid)
├─ name (text) ← "Thorne Research", "Life Extension"
├─ website, country
├─ gmp_certified (boolean)
├─ third_party_tested (boolean)
└─ timestamps

products
├─ id (uuid)
├─ brand (text) ← "Thorne"
├─ name (text) ← "Magnesium Bisglycinate"
├─ manufacturer_id → manufacturers.id
├─ category (text) ← "magnesium"
├─ serving_size, servings_per_container
├─ price_usd, price_per_serving (auto-calculated)
├─ status ← 'active', 'discontinued', 'pending_review'
└─ timestamps

product_ingredients (junction table)
├─ id (uuid)
├─ product_id → products.id
├─ ingredient_name (text) ← Must match ingredients-db.ts
├─ dose, unit (decimal, text) ← 200, "mg"
├─ form (text) ← "bisglycinate", "citrate", "oxide"
├─ bioavailability ← 'high', 'medium', 'low'
├─ daily_value_percentage
├─ is_proprietary_blend (boolean)
└─ display_order

certifications
├─ id (uuid)
├─ product_id → products.id
├─ type ← 'nsf_sport', 'usp_verified', 'informed_sport', etc.
├─ verified (boolean)
├─ verification_url
├─ certificate_number
├─ issued_date, expiration_date
├─ verified_at (when we last checked)
└─ timestamps

product_scores
├─ id (uuid)
├─ product_id → products.id
├─ evidence_score, evidence_breakdown (jsonb)
├─ safety_score, safety_breakdown (jsonb)
├─ formulation_score, formulation_breakdown (jsonb)
├─ manufacturing_score, manufacturing_breakdown (jsonb) ← Phase 2
├─ transparency_score, transparency_breakdown (jsonb) ← Phase 2
├─ sustainability_score, sustainability_breakdown (jsonb) ← Phase 5
├─ integrity_score (weighted average 0-100)
├─ tier ← 'rejected', 'standard', 'verified', 'elite'
├─ scored_at, scored_by, version
├─ rescore_reason
└─ is_current (boolean) ← Only one current score per product
```

---

## 🔐 RLS Policies

All tables have Row Level Security enabled with:

**Public Read Access:**
- Active products only (`status = 'active'`)
- Verified certifications only
- Current scores only (`is_current = true`)
- All manufacturers

**Write Access:**
- Currently restricted to service role (admin-only)
- TODO: Add practitioner/vendor roles in Phase 3

---

## ⚙️ Auto-Triggers

**1. Price Per Serving (auto-calculated):**
```sql
price_per_serving = price_usd / servings_per_container
```

**2. Updated Timestamps:**
- `products.updated_at` auto-updates on change
- `manufacturers.updated_at` auto-updates on change
- `certifications.updated_at` auto-updates on change

**3. Single Current Score:**
- When new score inserted with `is_current = true`
- All other scores for that product → `is_current = false`
- Maintains score history

---

## 🚀 How to Run This Migration

### **Option 1: Supabase CLI (Local)**

```bash
# Apply migration to local database
supabase db reset

# Or just push new migration
supabase db push
```

### **Option 2: Supabase Dashboard**

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Open SQL Editor
3. Copy entire contents of migration file
4. Run query

### **Option 3: MCP Tool (if available)**

```
Use the mcp_com_supabase__apply_migration tool to apply the migration
```

---

## 🧪 Testing the Migration

After running, verify tables exist:

```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'product_ingredients', 'certifications', 'product_scores', 'manufacturers');

-- Check sample data inserted
SELECT * FROM manufacturers;
SELECT * FROM products;
SELECT * FROM product_ingredients;
SELECT * FROM certifications;
```

You should see:
- 3 manufacturers (Thorne, Life Extension, NOW Foods)
- 1 sample product (Thorne Magnesium Bisglycinate)
- 1 ingredient record (Magnesium 200mg bisglycinate)
- 1 certification record (NSF Sport)

---

## 📊 Sample Queries

### **Get Product with Full Details:**

```sql
SELECT 
  p.brand,
  p.name,
  p.category,
  p.price_usd,
  p.price_per_serving,
  jsonb_agg(
    jsonb_build_object(
      'ingredient', pi.ingredient_name,
      'dose', pi.dose,
      'unit', pi.unit,
      'form', pi.form,
      'bioavailability', pi.bioavailability
    )
  ) as ingredients,
  array_agg(DISTINCT c.type) FILTER (WHERE c.verified = true) as certifications
FROM products p
LEFT JOIN product_ingredients pi ON p.id = pi.product_id
LEFT JOIN certifications c ON p.id = c.product_id
WHERE p.status = 'active'
GROUP BY p.id;
```

### **Get Products by Tier:**

```sql
SELECT 
  p.brand || ' ' || p.name as product,
  ps.integrity_score,
  ps.tier,
  ps.evidence_score,
  ps.safety_score,
  ps.formulation_score
FROM products p
JOIN product_scores ps ON p.id = ps.product_id
WHERE ps.is_current = true
  AND p.status = 'active'
ORDER BY ps.integrity_score DESC;
```

### **Find Expired Certifications:**

```sql
SELECT 
  p.brand || ' ' || p.name as product,
  c.type,
  c.expiration_date,
  DATE_PART('day', c.expiration_date - CURRENT_DATE) as days_until_expiration
FROM certifications c
JOIN products p ON c.product_id = p.id
WHERE c.expiration_date IS NOT NULL
  AND c.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY c.expiration_date ASC;
```

### **Get Products with High Bioavailability Forms:**

```sql
SELECT DISTINCT
  p.brand || ' ' || p.name as product,
  pi.ingredient_name,
  pi.form,
  pi.bioavailability
FROM products p
JOIN product_ingredients pi ON p.id = pi.product_id
WHERE pi.bioavailability = 'high'
  AND p.status = 'active'
ORDER BY p.brand, p.name;
```

---

## 🔄 Next Steps After Migration

1. **Seed Products:**
   - Use product-abstraction-agent to add 30-50 products
   - Start with Thorne, Life Extension, NOW Foods

2. **Add Formulation Data:**
   - Use formulation-integrity-agent to add bioavailable forms
   - Extend ingredients-db.ts with `forms` field

3. **Score Products:**
   - Run scoring engine on seeded products
   - Insert scores into `product_scores` table

4. **Start Certification Scraping:**
   - Use certification-scraping-agent to auto-populate `certifications` table
   - Schedule weekly sync

---

## 📝 TypeScript Types (for src/types/index.ts)

Add these types to match the database schema:

```typescript
export interface Product {
  id: string;
  brand: string;
  name: string;
  product_url?: string;
  image_url?: string;
  manufacturer_id?: string;
  category: string;
  serving_size?: string;
  servings_per_container?: number;
  price_usd?: number;
  price_per_serving?: number;
  status: 'active' | 'discontinued' | 'pending_review';
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_name: string;
  dose: number;
  unit: string;
  form?: string;
  bioavailability?: 'high' | 'medium' | 'low';
  daily_value_percentage?: number;
  is_proprietary_blend: boolean;
  display_order?: number;
  created_at: string;
}

export interface Certification {
  id: string;
  product_id: string;
  type: 'nsf_sport' | 'nsf_gmp' | 'usp_verified' | 'informed_sport' | 'informed_choice' | 'non_gmo' | 'organic_usda' | 'vegan' | 'gluten_free' | 'kosher' | 'halal';
  verified: boolean;
  verification_url?: string;
  certificate_number?: string;
  issued_date?: string;
  expiration_date?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductScore {
  id: string;
  product_id: string;
  evidence_score?: number;
  evidence_breakdown?: any;
  safety_score?: number;
  safety_breakdown?: any;
  formulation_score?: number;
  formulation_breakdown?: any;
  manufacturing_score?: number;
  manufacturing_breakdown?: any;
  transparency_score?: number;
  transparency_breakdown?: any;
  sustainability_score?: number;
  sustainability_breakdown?: any;
  integrity_score: number;
  tier: 'rejected' | 'standard' | 'verified' | 'elite';
  scored_at: string;
  scored_by: string;
  version: string;
  rescore_reason?: string;
  is_current: boolean;
  created_at: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  website?: string;
  country?: string;
  gmp_certified: boolean;
  fda_registered: boolean;
  third_party_tested: boolean;
  nsf_gmp_url?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

## ⚠️ Common Issues

**Issue 1: Migration fails with "relation already exists"**
- Solution: Run `DROP TABLE` commands first or use `supabase db reset`

**Issue 2: RLS blocking queries**
- Check: Are you using service role key or anon key?
- Service role bypasses RLS
- Anon key requires matching RLS policies

**Issue 3: Sample data not inserting**
- Check: Do manufacturers exist before inserting products?
- Use `WITH new_product AS (INSERT ... RETURNING id)` pattern

---

## 🎯 Success Checklist

- [ ] All 5 tables created successfully
- [ ] Indexes created (check with `\di` in psql)
- [ ] RLS policies enabled on all tables
- [ ] Triggers working (test by updating a product)
- [ ] Sample data inserted (3 manufacturers, 1 product)
- [ ] TypeScript types added to codebase
- [ ] Can query products via Supabase client in Next.js

---

**You're ready for Phase 1 execution!** 🚀

Next: Use formulation-integrity-agent to extend ingredients database with bioavailable forms.
