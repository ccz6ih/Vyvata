# Brand Submission Portal ↔ Practitioner Dispensary Program
## How They Connect

**Date:** April 21, 2026  
**Status:** Brand Submission Portal ✅ Built (P0 Complete) | Dispensary Program ⏳ Not Started

---

## Executive Summary

**You are on track.** The Brand Submission Portal we just built is a **critical prerequisite** for the Practitioner Dispensary Program. The dispensary program requires products to have:

1. ✅ **Verified score (75+)** — scoring engine already supports this
2. ✅ **Completed Brand Submission** — portal we just built enables this
3. ⏳ **Active commission agreement** — not yet built
4. ⏳ **Dispensary eligibility flag** — not yet built

**What we built:** The mechanism for brands to submit documentation and unlock Verified scoring  
**What's next:** The mechanism for practitioners to earn commissions on those verified products

---

## The Connection

### From the Dispensary Spec (Section 2A):

> **Brand Eligibility — Dispensary Program Entry Gate**
>
> | Requirement | Gate | Rationale |
> |-------------|------|-----------|
> | Minimum Vyvata Score | **75+ (Verified)** | Standard-tier products (60–74) are excluded. |
> | **Brand Submission Completed** | **Required** | **AI Inference scores (Path A) do not qualify. Full Brand Submission (Path B) required to unlock dispensary status.** |

The brand submission portal we just built IS "Path B" - the mechanism that unlocks dispensary eligibility.

### Data Flow

```
Brand submits via portal (what we built)
    ↓
Admin approves submission
    ↓
Product gets verified score with score_mode='verified'
    ↓
IF score >= 75 AND brand has commission agreement
    ↓
Product becomes dispensary-eligible
    ↓
Practitioners can earn commissions recommending it
```

---

## What We Built vs. What's Needed

### ✅ Already Built (Brand Submission Portal - Commit f1d582d)

**Database:**
- `brand_accounts` table - tracks brand identity and status
- `product_submissions` table - stores submission data
- `submission_history` table - audit trail
- `product_scores.score_mode` - differentiates AI Inferred vs Verified
- Verified scoring integration - `approveSubmission()` triggers `scoreProduct()` with verified mode

**APIs:**
- Brand submission CRUD endpoints
- Approval transaction that writes verified scores
- File upload infrastructure (needs Storage bucket created)

**UI:**
- Brand login/dashboard
- Multi-step submission form
- Admin review queue

**Business Logic:**
- Only `active` brands can submit
- Only `reviewing` submissions can be approved
- Approval atomically creates/updates product + verified score
- Score history with `is_current` enforcement

### ⏳ Needed for Dispensary Program

**New Database Tables (from Dispensary Step 1):**
- `practitioners` - practitioner identity, license verification, FTC agreement
- `practitioner_codes` - referral code generation
- `patient_practitioner_links` - Model B attribution
- `commission_agreements` - brand-level commission rate config
- `commission_ledger` - transaction log for all commissions
- `dispensary_eligible_products` - materialized cache of products eligible for practitioner channel

**New Services:**
1. **License Verification Service** (Step 2)
   - NPI lookup for MDs
   - State board verification for DCs, NDs
   - NABP verification for pharmacists
   - Quarterly re-verification cron

2. **Attribution Tracking** (Step 3)
   - Model A: Referral code tracking (30-day window)
   - Model B: Patient account linking (180-day window)
   - Session store for click attribution
   - Purchase event hooks

3. **Commission Calculation** (Step 4)
   - Rate lookup from `commission_agreements`
   - Split calculation (practitioner share vs Vyvata spread)
   - Eligibility check at purchase time
   - Pending → Confirmed state machine

4. **Payout Service** (Step 5)
   - Stripe Connect integration
   - Monthly disbursement runs
   - W-9 collection and 1099-NEC generation
   - $50 minimum threshold logic

5. **Score Alert System** (Step 6)
   - Notify practitioners when recommended product's score changes
   - Auto-suspend dispensary eligibility if score drops below 75

6. **Practitioner Dashboard UI**
   - Commission summary widget
   - Recommended products list
   - Patient Stack Builder
   - FTC disclosure status

---

## How to Extend What We Built

### 1. Add Dispensary Eligibility Check to Approval Transaction

**File:** `src/lib/submissions/approve-submission.ts`

After writing the verified score, check if product qualifies for dispensary:

```typescript
// After Step 9 (insert verified score)
// Step 10: Check dispensary eligibility
if (verifiedScore.integrity >= 75 && verifiedScore.tier !== 'rejected') {
  // Check if brand has commission agreement
  const { data: agreement } = await supabase
    .from('commission_agreements')
    .select('agreement_id')
    .eq('brand_id', submission.brand_accounts.id) // Need to link brand_account to brand
    .eq('status', 'active')
    .maybeSingle();

  const isEligible = !!agreement;
  const failReason = !agreement ? 'no_commission_agreement' : null;

  await supabase
    .from('dispensary_eligible_products')
    .upsert({
      product_id: productId,
      is_eligible: isEligible,
      eligibility_checked_at: new Date().toISOString(),
      score_at_check: verifiedScore.integrity,
      fail_reason: failReason,
    }, { onConflict: 'product_id' });
}
```

### 2. Add Commission Agreement Management

**New table migration:**

```sql
-- supabase/migrations/YYYYMMDD_commission_agreements.sql
CREATE TABLE public.commission_agreements (
  agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  
  -- Rate structure
  consumer_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- 8-12%
  practitioner_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00, -- 18-20%
  elite_rate DECIMAL(5,2) NOT NULL DEFAULT 23.50, -- 22-25%
  
  -- Agreement lifecycle
  effective_date DATE NOT NULL,
  termination_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'terminated')) DEFAULT 'active',
  
  -- Dispensary opt-in
  practitioner_channel_enabled BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commission_agreements_brand ON commission_agreements(brand_id);
CREATE INDEX idx_commission_agreements_status ON commission_agreements(status);
```

### 3. Link Brand Accounts to Brands

**Current gap:** `brand_accounts` table doesn't have a foreign key to `brands` table yet.

**Migration needed:**

```sql
-- Link brand_accounts to brands table
ALTER TABLE public.brand_accounts
  ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Or if brand_accounts IS the source of truth for brands:
-- Create brands from brand_accounts on first commission agreement
```

**Decision needed:** 
- Are `brand_accounts` (submission portal) and `brands` (scoring engine) the same entities?
- Or are they different (brand account = login credential, brand = manufacturer entity)?

### 4. Scoring Engine Cron to Update Dispensary Eligibility

**New file:** `src/lib/dispensary/update-eligibility.ts`

```typescript
// Runs after every score recalculation
// Updates dispensary_eligible_products based on new scores

export async function updateDispensaryEligibility(productId: string) {
  const supabase = getSupabaseServer();
  
  // Get current verified score
  const { data: score } = await supabase
    .from('product_scores')
    .select('integrity_score, tier')
    .eq('product_id', productId)
    .eq('score_mode', 'verified')
    .eq('is_current', true)
    .maybeSingle();
  
  if (!score) {
    // No verified score = not dispensary eligible
    await supabase
      .from('dispensary_eligible_products')
      .upsert({
        product_id: productId,
        is_eligible: false,
        eligibility_checked_at: new Date().toISOString(),
        fail_reason: 'no_verified_score',
      });
    return;
  }
  
  // Check score threshold (75+)
  if (score.integrity_score < 75) {
    await supabase
      .from('dispensary_eligible_products')
      .upsert({
        product_id: productId,
        is_eligible: false,
        eligibility_checked_at: new Date().toISOString(),
        score_at_check: score.integrity_score,
        fail_reason: 'score_below_threshold',
      });
    return;
  }
  
  // Check commission agreement exists
  const { data: product } = await supabase
    .from('products')
    .select('manufacturer_id')
    .eq('id', productId)
    .single();
  
  const { data: agreement } = await supabase
    .from('commission_agreements')
    .select('agreement_id')
    .eq('brand_id', product.manufacturer_id) // Assuming manufacturer = brand
    .eq('status', 'active')
    .eq('practitioner_channel_enabled', true)
    .maybeSingle();
  
  const isEligible = !!agreement;
  
  await supabase
    .from('dispensary_eligible_products')
    .upsert({
      product_id: productId,
      is_eligible: isEligible,
      eligibility_checked_at: new Date().toISOString(),
      score_at_check: score.integrity_score,
      fail_reason: !agreement ? 'no_commission_agreement' : null,
    });
}
```

---

## Recommended Implementation Path

### Phase 1: Foundation (1-2 weeks)
**Goal:** Enable first brand to opt into dispensary program

1. ✅ Brand submission portal (DONE)
2. Create `commission_agreements` table
3. Link `brand_accounts` to `brands` (or clarify relationship)
4. Create `dispensary_eligible_products` table
5. Wire eligibility check into approval transaction
6. Build admin UI to create commission agreements
7. Manual testing: Submit → Approve → Verify dispensary eligibility flag

### Phase 2: Practitioner Infrastructure (2-3 weeks)
**Goal:** First practitioner can sign up and get verified

1. Create `practitioners` table
2. Build practitioner signup flow (`/practitioner/register`)
3. NPI verification service (Step 2)
4. FTC disclosure agreement flow
5. Manual fallback for non-MD licenses
6. Admin practitioner approval queue

### Phase 3: Attribution & Commissions (2-3 weeks)
**Goal:** First commission earned and tracked

1. Create `practitioner_codes` table
2. Model A: Referral code generation and tracking
3. Create `commission_ledger` table
4. Commission calculation engine (Step 4)
5. Wire into existing order confirmation flow (if one exists)
6. Pending → Confirmed state transitions

### Phase 4: Patient Linking (1-2 weeks)
**Goal:** Model B attribution working

1. Create `patient_practitioner_links` table
2. Patient invite link generation
3. Account creation with practitioner link
4. Model B attribution logic
5. Patient revocation flow

### Phase 5: Payouts (1-2 weeks)
**Goal:** First practitioner gets paid

1. Stripe Connect integration
2. W-9 collection at enrollment
3. Monthly payout run
4. 1099-NEC generation (tax year-end)

### Phase 6: Practitioner Dashboard (2-3 weeks)
**Goal:** Practitioners have full visibility

1. Commission summary widget
2. Recommended products list
3. Patient Stack Builder tool
4. Score alert feed
5. Payout history and CSV export

---

## Key Decisions Needed

### 1. Brand Account vs Brand Entity
- **Question:** Is a `brand_account` (from submission portal) the same as a `brand` (manufacturer)?
- **Impact:** Determines how commission agreements are structured
- **Options:**
  - A: One-to-one (brand account = brand) → Simple
  - B: One-to-many (one brand can have multiple accounts) → More complex

### 2. Order/Purchase Infrastructure
- **Question:** Does Vyvata currently process orders, or is this future work?
- **Impact:** Attribution and commission calculation need a purchase event to hook into
- **If not built yet:** Need to build order tracking before dispensary program works

### 3. Practitioner Auth System
- **Question:** Do practitioners use the same auth as consumers, or separate?
- **Impact:** Determines if we extend existing Supabase Auth or create separate flow
- **Recommendation:** Separate practitioner auth with different permission model

### 4. Brand Commission Agreement Workflow
- **Question:** How do brands opt into the dispensary program?
- **Options:**
  - A: Self-service (brand dashboard has "Enable Practitioner Channel" toggle)
  - B: Manual (sales team negotiates, admin creates agreement)
- **Recommendation:** Start with B (manual), add A later

---

## What to Build Next

Based on the dispensary spec and what we have, I recommend this order:

### Immediate (Week 1)
1. **Commission agreements table** - Foundation for everything else
2. **Dispensary eligibility table** - Marks which products practitioners can earn on
3. **Link brand_accounts to brands** - Clarify the relationship
4. **Wire eligibility into approval** - So approved submissions auto-check dispensary status

### Short-term (Weeks 2-4)
1. **Practitioners table** - Identity and verification foundation
2. **NPI verification service** - Automated MD/DO verification
3. **Practitioner signup flow** - Let first practitioner register
4. **FTC disclosure agreement** - Legal compliance gate

### Medium-term (Weeks 5-8)
1. **Referral code generation** - Model A attribution
2. **Commission ledger** - Transaction tracking
3. **Commission calculation engine** - Fire on purchases
4. **Basic practitioner dashboard** - Show pending/confirmed commissions

### Longer-term (Weeks 9-12)
1. **Patient linking** - Model B attribution
2. **Payout service** - Stripe Connect + ACH
3. **Full dashboard** - Patient Stack Builder, alerts, analytics
4. **Score alert system** - Notify practitioners on tier changes

---

## You Are On Track ✅

The brand submission portal is the **critical first step** for the dispensary program. Without it:
- Brands can't unlock Verified scores (required for dispensary)
- No way to prove product quality to practitioners
- No differentiation from AI-inferred scores

**What we built gives you:**
1. Verified scoring infrastructure ✅
2. Brand identity and authentication ✅
3. Admin approval workflow ✅
4. Audit trail for compliance ✅

**Next logical step:** Build the commission agreements table and dispensary eligibility checker, then you can start onboarding brands to the practitioner channel.

The practitioner dispensary program is a **revenue multiplier** on top of the quality foundation we just built. Smart sequencing. 🎯
