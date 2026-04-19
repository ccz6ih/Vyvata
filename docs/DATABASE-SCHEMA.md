# Vyvata Supabase Schema Documentation

**Last Updated:** 2026-04-19  
**Purpose:** Complete schema reference for all production tables, constraints, and relationships

---

## Table of Contents

1. [Core Product System](#core-product-system)
2. [Scoring & Certifications](#scoring--certifications)
3. [Compliance & Safety](#compliance--safety)
4. [User & Practitioner System](#user--practitioner-system)
5. [Session & Audit System](#session--audit-system)
6. [Brand Management](#brand-management)
7. [Infrastructure](#infrastructure)
8. [Recent Changes](#recent-changes)

---

## Core Product System

### `products`
**Purpose:** Master product catalog from DSLD and manual imports

```sql
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  name text NOT NULL,
  product_url text,
  image_url text,
  manufacturer_id uuid REFERENCES manufacturers(id),
  category text NOT NULL,
  serving_size text,
  servings_per_container integer,
  price_usd numeric,
  price_per_serving numeric,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'discontinued', 'pending_review')),
  slug text NOT NULL,
  dsld_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Key Stats (as of 2026-04-19):**
- 207 products in database
- 138 without ingredients (needs cleanup)
- 1/207 have manufacturer_id (needs linkage)

**Related Tables:**
- `product_ingredients` - ingredient compositions
- `product_scores` - integrity scoring
- `certifications` - product-level certifications
- `manufacturers` - brand/facility information

---

### `product_ingredients`
**Purpose:** Detailed ingredient composition per product

```sql
CREATE TABLE public.product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  ingredient_name text NOT NULL,
  dose numeric NOT NULL,
  unit text NOT NULL,
  form text,
  bioavailability text CHECK (bioavailability IN ('high', 'medium', 'low')),
  daily_value_percentage numeric,
  is_proprietary_blend boolean DEFAULT false,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Current Status:**
- ⚠️ 138/207 products have NO ingredients (67% incomplete)
- Can be backfilled from DSLD via `/api/admin/products/cleanup-empty`

---

### `manufacturers`
**Purpose:** Brand/facility master list with certification flags

```sql
CREATE TABLE public.manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website text,
  country text,
  gmp_certified boolean DEFAULT false,
  fda_registered boolean DEFAULT false,
  third_party_tested boolean DEFAULT false,
  nsf_gmp_url text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Current Status:**
- 18 manufacturers in database
- All have certification flags (seeded via `/api/admin/manufacturers/seed-certifications`)
- Premium brands: Thorne, Pure Encapsulations, Life Extension, Nordic Naturals, etc.

---

## Scoring & Certifications

### `product_scores`
**Purpose:** Multi-dimensional integrity scoring with AI vs Verified modes

```sql
CREATE TABLE public.product_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  
  -- 6 scoring pillars
  evidence_score numeric,
  evidence_breakdown jsonb,
  safety_score numeric,
  safety_breakdown jsonb,
  formulation_score numeric,
  formulation_breakdown jsonb,
  manufacturing_score numeric,
  manufacturing_breakdown jsonb,
  transparency_score numeric,
  transparency_breakdown jsonb,
  sustainability_score numeric,
  sustainability_breakdown jsonb,
  
  -- Overall
  integrity_score numeric NOT NULL,
  tier text NOT NULL CHECK (tier IN ('rejected', 'standard', 'verified', 'elite')),
  
  -- Scoring metadata
  score_mode text NOT NULL DEFAULT 'ai_inferred'
    CHECK (score_mode IN ('ai_inferred', 'verified')),
  scored_at timestamptz NOT NULL DEFAULT now(),
  scored_by text DEFAULT 'system',
  version text DEFAULT 'v1.0',
  rescore_reason text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one current score per (product, mode)
CREATE UNIQUE INDEX uq_product_scores_current_by_mode
  ON product_scores (product_id, score_mode)
  WHERE is_current = true;
```

**Score Modes:**
- **ai_inferred:** Derived from public data only (capped)
- **verified:** Full-weight score unlocked by approved brand submission

**Current Status:**
- ✅ 220/207 products scored (106% coverage - includes rescores)
- Dual-mode migration applied: `20260420_score_mode.sql`

---

### `certifications`
**Purpose:** Product-level third-party certifications (NSF Sport, USP, etc.)

```sql
CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  type text NOT NULL CHECK (type IN (
    'nsf_sport', 'nsf_gmp', 'usp_verified',
    'informed_sport', 'informed_choice',
    'non_gmo', 'organic_usda', 'vegan', 'gluten_free',
    'kosher', 'halal'
  )),
  verified boolean NOT NULL DEFAULT false,
  verification_url text,
  certificate_number text,
  issued_date date,
  expiration_date date,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Current Status:**
- 🟡 Only 3 certifications (NSF Sport for Thorne products)
- Expected: 20+ after running `/api/cron/sync-certifications`
- Sync endpoint exists: `/api/admin/sync-certifications-targeted`

---

### `manufacturer_certifications`
**Purpose:** Facility-level certifications (cGMP, NSF GMP, ISO, etc.)

```sql
CREATE TABLE public.manufacturer_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  certification_type text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  expires_at timestamptz,
  certification_number text,
  issuing_body text,
  scope text,
  evidence_url text,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_manufacturer_certifications_manufacturer_id
  ON manufacturer_certifications(manufacturer_id);

CREATE INDEX idx_manufacturer_certifications_type
  ON manufacturer_certifications(certification_type);

-- One certification type per manufacturer
CREATE UNIQUE INDEX idx_manufacturer_certifications_unique
  ON manufacturer_certifications(manufacturer_id, certification_type);
```

**Current Status:**
- ✅ 51 certifications seeded (2026-04-19)
- Types: cgmp, fda_registered, third_party_tested, nsf_gmp
- Migration: `20260421_manufacturer_certifications.sql`

---

## Compliance & Safety

### `compliance_flags`
**Purpose:** FDA recalls, warning letters, CAERS adverse events, import alerts

```sql
CREATE TABLE public.compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN (
    'openfda_recall', 'fda_warning_letter', 'caers', 'import_alert'
  )),
  source_id text NOT NULL,
  subject text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  violation_types text[] NOT NULL DEFAULT '{}',
  raw_data jsonb,
  issued_date date,
  
  -- Matching
  matched_manufacturer_id uuid REFERENCES manufacturers(id),
  matched_product_id uuid REFERENCES products(id),
  match_confidence text NOT NULL DEFAULT 'unmatched'
    CHECK (match_confidence IN ('high', 'medium', 'low', 'unmatched')),
  match_notes text,
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by text,
  resolved_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Current Status:**
- ✅ 34 flags, last write today (compliance scrapers working!)
- 0 flags pending >14 days
- Synced via cron:
  - `/api/cron/sync-recalls` (weekly)
  - `/api/cron/sync-caers` (weekly)
  - `/api/cron/sync-warning-letters` (weekly)

---

### `scraper_runs`
**Purpose:** Audit log for all compliance scraper executions

```sql
CREATE TABLE public.scraper_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text CHECK (status IN ('success', 'failure', 'partial')),
  rows_inserted integer DEFAULT 0,
  rows_updated integer DEFAULT 0,
  error_message text,
  raw_output jsonb
);
```

**Usage:** Tracks execution history for:
- `sync-recalls`
- `sync-caers`
- `sync-warning-letters`
- `sync-certifications`

---

## User & Practitioner System

### `users`
**Purpose:** End-user accounts (patients/consumers)

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  created_via text DEFAULT 'email_gate'
);
```

---

### `practitioners`
**Purpose:** Healthcare provider accounts with verification workflow

```sql
CREATE TABLE public.practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  credential text,
  specialty text,
  organization text,
  
  -- Access control
  tier text NOT NULL DEFAULT 'free',
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Verification workflow
  verification_status text NOT NULL DEFAULT 'pending',
  license_number text,
  practice_type text,
  practice_website text,
  patient_volume text,
  use_case text,
  registered_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  rejection_reason text,
  
  -- Usage stats
  patient_count integer DEFAULT 0,
  access_code text UNIQUE,
  last_login_at timestamptz,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Related Tables:**
- `practitioner_sessions` - auth tokens
- `patient_links` - patient management
- `patient_notes` - clinical notes
- `protocols` - custom protocols

---

### `patient_links`
**Purpose:** Practitioner-patient relationship tracking

```sql
CREATE TABLE public.patient_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES practitioners(id),
  session_id text NOT NULL,
  audit_id uuid REFERENCES audits(id),
  quiz_response_id uuid REFERENCES quiz_responses(id),
  patient_label text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  added_at timestamptz DEFAULT now()
);
```

**Status Values:** `active`, `archived`, `transferred`

---

### `patient_notes`
**Purpose:** Clinical notes attached to patient links

```sql
CREATE TABLE public.patient_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_link_id uuid NOT NULL REFERENCES patient_links(id),
  note text NOT NULL,
  created_by uuid REFERENCES practitioners(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Session & Audit System

### `sessions`
**Purpose:** Stack analysis session state

```sql
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  raw_input text NOT NULL,
  goals jsonb NOT NULL DEFAULT '[]',
  ingredients jsonb NOT NULL DEFAULT '[]',
  dsld_products jsonb
);
```

**Flow:** User submits stack → parser extracts ingredients → creates session → generates audit

---

### `audits`
**Purpose:** Stack integrity audit reports

```sql
CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id),
  public_slug text NOT NULL UNIQUE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  teaser_json jsonb NOT NULL DEFAULT '{}',
  report_json jsonb,
  email text,
  is_unlocked boolean NOT NULL DEFAULT false,
  compliance_flags jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

**Access Model:**
- Free: teaser_json visible (score + summary)
- Unlocked: full report_json visible (detailed breakdown)

---

### `quiz_responses`
**Purpose:** Patient health assessment data

```sql
CREATE TABLE public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  audit_id uuid,
  practitioner_id uuid REFERENCES practitioners(id),
  
  -- Demographics
  age_range text,
  biological_sex text,
  weight_kg numeric,
  height_cm numeric,
  
  -- Health profile
  primary_goals text[] DEFAULT '{}',
  health_conditions text[] DEFAULT '{}',
  medications text[] DEFAULT '{}',
  allergies text[] DEFAULT '{}',
  
  -- Lifestyle
  diet_type text,
  activity_level text,
  avg_sleep_hours numeric,
  sleep_quality text,
  recovery_score text,
  
  -- Data integration
  lab_data jsonb DEFAULT '{}',
  wearable_platform text,
  wearable_connected boolean DEFAULT false,
  
  -- Protocol matching
  assigned_protocol_slug text,
  protocol_match_score numeric,
  raw_responses jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### `protocols`
**Purpose:** Standardized supplement protocols (foundation/optimization/therapeutic)

```sql
CREATE TABLE public.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  tier text NOT NULL CHECK (tier IN ('foundation', 'optimization', 'therapeutic')),
  
  -- Protocol definition
  goals text[] NOT NULL DEFAULT '{}',
  ingredients jsonb NOT NULL DEFAULT '[]',
  expected_benefits text[] NOT NULL DEFAULT '{}',
  timeline text,
  contraindications text[] NOT NULL DEFAULT '{}',
  monitoring_advice text,
  
  -- Evidence
  evidence_summary text,
  evidence_tier text CHECK (evidence_tier IN ('strong', 'moderate', 'weak')),
  
  -- Ownership
  created_by uuid REFERENCES practitioners(id),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Examples:** "Athletic Performance Foundation", "Cognitive Optimization", "Sleep Support Therapeutic"

---

## Brand Management

### `brand_accounts`
**Purpose:** Verified brand representative accounts for submissions

```sql
CREATE TABLE public.brand_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_name text,
  contact_role text,
  manufacturer_id uuid REFERENCES manufacturers(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Status Workflow:**
1. `pending` - Email verification required
2. `active` - Can submit product documentation
3. `suspended` - Access revoked

---

### `product_submissions`
**Purpose:** Brand documentation submissions for verified scoring

```sql
CREATE TABLE public.product_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id uuid NOT NULL REFERENCES brand_accounts(id),
  product_id uuid REFERENCES products(id),
  
  -- Claimed product identity
  claimed_brand text,
  claimed_product_name text,
  claimed_sku text,
  
  -- Submission data
  submission_data jsonb NOT NULL DEFAULT '{}',
  file_references jsonb NOT NULL DEFAULT '[]',
  
  -- Workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'reviewing', 'approved', 'rejected', 'needs_revision'
  )),
  submitted_at timestamptz,
  review_started_at timestamptz,
  decided_at timestamptz,
  
  -- Review
  reviewer_email text,
  reviewer_notes text,
  verified_score_applied_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Workflow:**
1. Brand creates `draft` submission
2. Brand clicks "Submit" → `submitted`
3. Admin starts review → `reviewing`
4. Admin approves → `approved` + trigger verified score generation
5. If issues → `needs_revision` or `rejected`

---

## Infrastructure

### `dsld_cache`
**Purpose:** Cache DSLD API responses to reduce rate-limited API calls

```sql
CREATE TABLE public.dsld_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  request_type text NOT NULL,
  
  -- Product identification
  dsld_id text,
  product_name text,
  brand_name text,
  
  -- Cache data
  response_data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  
  -- Active product tracking
  is_active_product boolean DEFAULT false,
  needs_refresh boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Rate Limit:** 1,000 requests/hour (DSLD API)  
**Strategy:** Cache product details for 30 days, search results for 7 days

---

### `referrals`
**Purpose:** Track viral sharing of audit reports

```sql
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES audits(id),
  public_slug text NOT NULL,
  email text,
  referred_at timestamptz DEFAULT now()
);
```

---

### `outcomes`
**Purpose:** Wearable data integration for outcome tracking

```sql
CREATE TABLE public.outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  wearable_source text,
  metric_name text NOT NULL,
  baseline numeric,
  latest numeric,
  recorded_at timestamptz DEFAULT now()
);
```

**Planned Integrations:** Whoop, Oura, Apple Health, Garmin

---

## Recent Changes

### 2026-04-19: Manufacturer Certifications Table
**Migration:** `20260421_manufacturer_certifications.sql`

**Added:**
- `manufacturer_certifications` table for facility-level certs
- 51 certifications seeded across 18 manufacturers
- Unique constraint on (manufacturer_id, certification_type)

**Impact:**
- Health audit now shows 🟢 Green for manufacturer certs
- Manufacturing scoring can now reach 20/20 (methodology claim validated)

---

### 2026-04-20: Dual-Mode Scoring
**Migration:** `20260420_score_mode.sql`

**Added:**
- `score_mode` column to `product_scores` ('ai_inferred' vs 'verified')
- Unique index on (product_id, score_mode, is_current)
- Updated trigger to scope by mode

**Impact:**
- Single product can have both AI score (capped) and verified score (full-weight)
- Enables brand submission workflow with score upgrades

---

### 2026-04-18: Initial Product Schema
**Migration:** `20260418_vsf_phase1_products_and_scoring.sql`

**Created:**
- Core product tables: products, manufacturers, product_ingredients
- Scoring system: product_scores with 6 pillars
- Certification tracking: certifications table

---

## Health Status (2026-04-19)

**Overall:** 🟡 Yellow (4/5 Green)

| System | Status | Details |
|--------|--------|---------|
| Product Import | 🟢 Green | 207 products |
| Scoring Pipeline | 🟢 Green | 220/207 scored (106%) |
| Compliance Flags | 🟢 Green | 34 flags, active scrapers |
| Certifications | 🟡 Yellow | 3 product certs (need 20+) |
| Manufacturer Certs | 🟢 Green | 51 certs, synced today |

**Action Items:**
1. ⚠️ Cleanup 138 products without ingredients
2. ⚠️ Run product certification sync (3 → 20+)
3. ⚠️ Link products to manufacturers (1/207 linked)
4. ℹ️ Create missing cron routes (refresh-active-products, cleanup-cache)

---

## Schema Statistics

**Total Tables:** 24

**By Category:**
- Products & Scoring: 6 tables
- Compliance & Safety: 2 tables
- User System: 6 tables
- Session & Audit: 5 tables
- Brand Management: 2 tables
- Infrastructure: 3 tables

**Foreign Keys:** 34 relationships  
**Unique Constraints:** 15  
**Check Constraints:** 18  
**Indexes:** 25+

---

## Migration Files

All migrations stored in: `supabase/migrations/`

**Active Migrations:**
- `20260119_add_dsld_id_to_products.sql`
- `20260418_add_dsld_products.sql`
- `20260418_add_patient_status_column.sql`
- `20260418_add_user_id_to_audits.sql`
- `20260418_compliance_flags.sql`
- `20260418_create_patient_notes_table.sql`
- `20260418_create_protocols_table.sql`
- `20260418_dsld_cache.sql`
- `20260418_patient_links_invite_id.sql`
- `20260418_practitioner_invites.sql`
- `20260418_products_slug.sql`
- `20260418_relax_audits_rls.sql`
- `20260418_seed_popular_products.sql`
- `20260418_vsf_phase1_products_and_scoring.sql`
- `20260420_brand_submissions.sql`
- `20260420_score_mode.sql` ⭐ Dual-mode scoring
- `20260421_scraper_runs.sql`
- `20260421_manufacturer_certifications.sql` ⭐ NEW

---

## Next Steps

**High Priority:**
1. Run `/api/cron/sync-certifications` to boost product certs 3 → 20+
2. Link products to manufacturers (batch update based on brand name)
3. Test enhanced quick-import (24 categories, 100-result depth)
4. Cleanup 138 products without ingredients

**Medium Priority:**
1. Create missing cron routes (refresh-active-products, cleanup-cache)
2. Add RLS policies audit
3. Document API endpoints in separate file

**Low Priority:**
1. Add full-text search indexes (products.name, manufacturers.name)
2. Archive old product_scores (keep only is_current=true)
3. Add analytics views for practitioner dashboard

---

**Generated:** 2026-04-19  
**Schema Source:** Production Supabase project (uflawbimvhwkrrkkxjgn)  
**Health Audit Tool:** `scripts/health-audit.ts`
