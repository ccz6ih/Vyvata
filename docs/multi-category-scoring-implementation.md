# Multi-Category Product Scoring Implementation

**Date:** August 6, 2026  
**Status:** ✅ Complete

## Overview

Expanded the Vyvata VSF (Verified Supplement Framework) scoring algorithm from supplement-only to support 4 product categories: **supplement**, **wearable**, **diagnostic**, and **sleep**.

## Changes Made

### 1. Database Schema (`20260425_multi_category_support.sql`)

- Added `category` column to `products` table (CHECK constraint: supplement, wearable, diagnostic, sleep)
- Created `product_category_metadata` table with category-specific fields:
  - **Wearables:** sensor_type, fda_clearance_number, battery_life_hours, data_export_format, claimed_accuracy
  - **Diagnostics:** biomarkers[], clia_number, cap_accredited, sample_collection_method, lab_name, turnaround_time_days
  - **Sleep:** product_type, material_composition, oeko_tex_certified, certipur_us_certified, fire_safety_standard, therapeutic_parameter
- Added affiliate infrastructure: `affiliate_url`, `affiliate_program`, `affiliate_commission_rate`
- Created `affiliate_clicks` tracking table
- Seeded 20 example products (5 per category)

### 2. Scoring Algorithm (`src/lib/product-scoring.ts`)

#### New Interfaces
```typescript
interface CategoryMetadata {
  // Wearable fields
  sensor_type?: string;
  fda_clearance_number?: string;
  battery_life_hours?: number;
  data_export_format?: string;
  claimed_accuracy?: string;
  
  // Diagnostic fields
  biomarkers?: string[];
  clia_number?: string;
  cap_accredited?: boolean;
  sample_collection_method?: string;
  lab_name?: string;
  turnaround_time_days?: number;
  
  // Sleep fields
  product_type?: string;
  material_composition?: Record<string, number>;
  oeko_tex_certified?: boolean;
  certipur_us_certified?: boolean;
  fire_safety_standard?: string;
  therapeutic_parameter?: string;
}
```

#### Category-Specific Scoring Functions

**`scoreWearable(meta, complianceFlags)`**
- **Evidence (50-100):** Sensor quality (CGM +40, ECG +30, PPG +20), FDA clearance +10
- **Formulation (50-100):** FDA clearance +20, battery life (168h+ = +30)
- **Transparency (50-100):** Data export format (API = +30, CSV = +20), claimed accuracy +15

**`scoreDiagnostic(meta)`**
- **Evidence (50-100):** Biomarker count (+5 each, max 40), sample quality bonus
- **Formulation (50-100):** Collection method (at-home finger prick +20), turnaround time (≤3 days = +30)
- **Manufacturing (50-100):** CLIA certification +30, CAP accreditation +30, lab disclosure +10
- **Transparency (60-100):** Lab disclosure +20, methodology transparency +20

**`scoreSleep(meta)`**
- **Evidence (50-100):** Research-backed product types +20, therapeutic parameters +20
- **Formulation (50-100):** Material disclosure +20, natural materials +15, Oeko-Tex +15, CertiPUR-US +10
- **Manufacturing (50-100):** Fire safety standards +25, certifications +25
- **Transparency (60-100):** Material disclosure +25, safety standards +10

#### Updated `scoreProductDual()` Function
Added category routing logic:
```typescript
const category = input.product.category || "supplement";

if (category === "wearable") {
  const wearableScores = scoreWearable(input.categoryMetadata, input.complianceFlags);
  evidence = wearableScores.evidence;
  formulation = wearableScores.formulation;
  transparency = wearableScores.transparency;
  // ... safety from compliance flags, manufacturing from existing logic
} else if (category === "diagnostic") {
  // ... diagnostic scoring
} else if (category === "sleep") {
  // ... sleep scoring
} else {
  // Default to supplement scoring (existing logic)
}
```

### 3. Orchestration (`src/lib/scoring/rescore-job.ts`)

- Added `CategoryMetadata` import
- Updated product query to fetch `category` field
- Added category metadata query: `product_category_metadata` table join
- Pass `categoryMetadata` to `scoreProductDual()` function

## Results

### Before Algorithm Update (April 27, 2026)
All non-supplement products scored **31 (rejected tier)** because the algorithm only evaluated ingredients.

### After Algorithm Update (August 6, 2026)

| Category    | Avg Score | Range  | Tier Distribution |
|-------------|-----------|--------|-------------------|
| Wearables   | **64**    | 58-69  | 4 standard, 1 rejected |
| Diagnostics | **65**    | 62-69  | 5 standard |
| Sleep       | **69**    | 62-74  | 5 standard |

**Top Scorers:**
- **Casper Original Hybrid Mattress:** 74 (standard) - material composition, Oeko-Tex, fire safety
- **Gravity Weighted Blanket:** 73 (standard) - natural materials, CertiPUR-US
- **Dexcom G7 CGM:** 69 (standard) - CGM sensor, FDA clearance, API data export
- **InsideTracker Ultimate Blood Panel:** 69 (standard) - comprehensive biomarkers, CLIA/CAP certified
- **Function Health Full Body Membership:** 69 (standard) - extensive biomarker panel, lab certifications

## Scoring Methodology by Category

### Wearables
Focus on **clinical validity** and **data quality**. Sensors with regulatory clearance (FDA), robust data export (API access), and long battery life score highest.

### Diagnostics
Focus on **lab quality** and **test comprehensiveness**. CLIA/CAP certified labs with broad biomarker panels and convenient sample collection score highest.

### Sleep
Focus on **material safety** and **therapeutic efficacy**. Products with natural materials, safety certifications (Oeko-Tex, CertiPUR-US, fire safety), and research-backed therapeutic claims score highest.

### Supplements (Existing)
Focus on **ingredient evidence**, **formulation quality**, and **manufacturing standards** (GMP, third-party testing, bioavailability).

## VSF Tier Thresholds (All Categories)

- **Elite:** 90-100
- **Verified:** 75-89
- **Standard:** 60-74
- **Rejected:** <60

## Future Enhancements

1. **Verified Mode:** Once brand submissions exist, verified mode will allow full 100-point scale (current AI-inferred mode caps at lower max)
2. **Sustainability Scoring:** Currently placeholder (60 for all). Add category-specific sustainability metrics (packaging, carbon footprint, ethical sourcing)
3. **Additional Metadata:** Expand wearable scoring with connectivity features, app quality, third-party validation studies
4. **Dynamic Weighting:** Consider category-specific dimension weights (e.g., evidence weighted higher for diagnostics)

## Files Modified

- `src/lib/product-scoring.ts` - Core scoring algorithm
- `src/lib/scoring/rescore-job.ts` - Orchestration layer
- `supabase/migrations/20260425_multi_category_support.sql` - Schema
- `supabase/migrations/20260425_seed_example_products_v2.sql` - Seed data

## Testing

✅ All 20 seeded products successfully scored  
✅ Category-specific scoring logic validated  
✅ Score history preserved (can see before/after comparison)  
✅ No errors during batch rescoring  
✅ Tier distribution appropriate for product quality

---

**Implementation Status:** Production-ready. All non-supplement products now receive appropriate VSF integrity scores based on category-specific criteria.
