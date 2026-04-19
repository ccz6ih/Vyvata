# UI V2 and Brand Submission — Implementation Plan

> **Purpose:** Lift the genuinely valuable ideas from the design mockup into the actual Vyvata codebase without losing what's already working. Two architectural additions (AI-inferred vs verified scoring split, brand submission portal) and one visual refresh (scorecard UI redesign).
>
> **Context:** This is the follow-on to `docs/CLOSE-THE-LOOP-PLAN.md`. Everything here assumes Close-the-Loop is complete or at least that slug URLs, share buttons, and the product OG route are landed. Read that plan first if you haven't.

---

## Why this plan exists

A collaborator sent over a polished React prototype of a scoring engine UI with two-path scoring (AI Inferred vs Verified), a gap report, a brand submission portal, and a scorecard redesign. The prototype is static — mock data, fake scanning, no persistence. But the *ideas inside it are sharp*, and three of them deserve to graduate from mockup to product:

1. **Two-path scoring** — An AI-inferred score (capped, derived from public data only) vs a verified score (unlocked by brand submission). This is the right architectural split because it encodes a principle: *opacity is penalized by absence of data, not excused by it.*
2. **Gap report** — For any product on the AI-inferred view, show exactly how many points the brand could gain by verifying each dimension. Turns the scorecard into a lead-gen funnel for brand submissions.
3. **Brand submission portal** — A form pre-populated from public data where brands confirm, correct, and upload supporting evidence. The actual monetization/engagement path for the business.

The UI redesign (tabs, score history, related products, animated ring, stat cards) is worth adopting as a visual refresh of the existing `/products/[slug]` page.

**What we're not taking from the mockup:**

- Hardcoded `MOCK_PRODUCTS` object. The data comes from the real DB.
- Fake `setInterval` scanning animation. Real queries, loading state.
- Sora font. Montserrat is already loaded and reads nearly identical.
- The arbitrary dimension caps in the mockup (`publicMax: 25`, `intakeBonus: 0`, etc.). These need calibration based on what's actually derivable from public sources — see Section 2.

---

## Prerequisites

Read before starting:

- `docs/CLOSE-THE-LOOP-PLAN.md` — this plan builds on slug URLs, OG image route, share buttons, and automated rescore
- `STRATEGIC-REVIEW-2026-04.md` — why VSF is the business model and why two-path scoring fits it
- `AGENTS.md` / `CLAUDE.md` — Next.js 16 conventions
- `src/app/products/[id]/page.tsx` or (post-Close-the-Loop) `src/app/products/[slug]/page.tsx` — current scorecard
- `src/lib/product-scoring.ts` — current scoring engine
- `src/lib/scoring-engine.ts` — stack-level scoring (for conventions, not modification)
- `supabase/migrations/20260418_vsf_phase1_products_and_scoring.sql` — products + scores schema

Confirm Close-the-Loop status before starting. If the slug migration, rescore RPC, and product OG route aren't in place yet, finish those first — several pieces here assume they exist.

---

## 1. Data model: two-path scoring

### 1.1 Migration — extend `product_scores` with mode

New migration: `supabase/migrations/20260420_score_mode.sql`

```sql
-- Migration: Two-path scoring (AI Inferred vs Verified)
-- Created: 2026-04-20
-- Purpose: Enable dual-mode scoring so a single product can have both an
--          AI-inferred score (from public data only, capped) and a Verified
--          score (unlocked when brand submits documentation).
-- Related: docs/UI-V2-AND-SUBMISSION-PLAN.md

-- ══════════════════════════════════════════════════════════════
-- 1. Add score_mode column
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.product_scores
  ADD COLUMN IF NOT EXISTS score_mode TEXT NOT NULL DEFAULT 'ai_inferred'
    CHECK (score_mode IN ('ai_inferred', 'verified'));

-- ══════════════════════════════════════════════════════════════
-- 2. Drop any existing uniqueness constraint on (product_id, is_current)
--    and replace with a mode-aware one
-- ══════════════════════════════════════════════════════════════

-- Find and drop the existing unique index if present
DO $$
DECLARE
  v_idx_name TEXT;
BEGIN
  SELECT indexname INTO v_idx_name
  FROM pg_indexes
  WHERE tablename = 'product_scores'
    AND schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%(product_id)%is_current%';
  IF FOUND THEN
    EXECUTE format('DROP INDEX IF EXISTS public.%I', v_idx_name);
  END IF;
END $$;

-- One current score per (product, mode)
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_scores_current_by_mode
  ON public.product_scores (product_id, score_mode)
  WHERE is_current = true;

-- ══════════════════════════════════════════════════════════════
-- 3. Backfill: all existing rows are ai_inferred until proven otherwise
-- ══════════════════════════════════════════════════════════════

UPDATE public.product_scores
SET score_mode = 'ai_inferred'
WHERE score_mode IS NULL;
```

### 1.2 Dimension caps — constants, not data

New file: `src/lib/scoring/dimension-caps.ts`

This is the calibration layer. The friend's mockup used arbitrary numbers. Here's the honest breakdown of what each dimension can legitimately score from public data alone, versus what requires brand submission.

```typescript
// Dimension scoring caps — how much of each dimension's weight can be
// awarded from public data alone, and how much requires brand submission.
//
// The rule: if a score component cannot be derived deterministically from
// a public source, it belongs in intakeBonus. Missing intake data scores
// zero — never assume in the brand's favor.

export type DimensionId =
  | "evidence"
  | "formulation"
  | "manufacturing"
  | "safety"
  | "transparency"
  | "sustainability";

export interface DimensionCap {
  id: DimensionId;
  label: string;
  icon: string;
  weight: number;          // total points available in Verified mode
  publicMax: number;       // maximum achievable from public data alone
  intakeBonus: number;     // additional points unlocked by brand submission
  tooltip: string;
  publicSources: string[];
  intakeSources: string[];
}

export const DIMENSION_CAPS: Record<DimensionId, DimensionCap> = {
  evidence: {
    id: "evidence",
    label: "Evidence Quality",
    icon: "🔬",
    weight: 25,
    // PubMed is public and comprehensive. Evidence grade is fully
    // derivable without brand participation.
    publicMax: 25,
    intakeBonus: 0,
    tooltip: "Strength of clinical evidence for the product's primary claims.",
    publicSources: ["PubMed RCT lookup", "NCBI meta-analyses", "Cochrane reviews"],
    intakeSources: ["Product-specific RCTs commissioned by brand"],
  },
  formulation: {
    id: "formulation",
    label: "Formulation Integrity",
    icon: "⚗️",
    weight: 20,
    // NIH DSLD gives us ingredient/dose/form at label level. But
    // bioavailability form nuance, synergy rationale, and proprietary
    // blend exposure require brand submission.
    publicMax: 12,
    intakeBonus: 8,
    tooltip: "Clinically effective dosing in bioavailable forms with no hidden blends.",
    publicSources: ["NIH DSLD", "Label OCR parse", "Proprietary blend detection"],
    intakeSources: ["Full formula breakdown", "Bioavailability notes", "Synergy rationale"],
  },
  manufacturing: {
    id: "manufacturing",
    label: "Manufacturing & Purity",
    icon: "🏭",
    weight: 20,
    // NSF/USP/Informed Sport registries cover most of what matters.
    // Remaining 4 points require batch-level CoA + facility audit docs.
    publicMax: 16,
    intakeBonus: 4,
    tooltip: "GMP compliance, third-party certification, and contamination testing.",
    publicSources: ["NSF registry", "USP Verified registry", "Informed Sport registry"],
    intakeSources: ["Batch-level CoA", "Facility audit reports", "In-house QC data"],
  },
  safety: {
    id: "safety",
    label: "Safety Profile",
    icon: "🛡️",
    weight: 15,
    // FDA CAERS, MedWatch, and recall databases are comprehensive.
    // Full credit achievable from public data if clean.
    publicMax: 15,
    intakeBonus: 0,
    tooltip: "Adverse event history, drug interactions, and risk communication.",
    publicSources: ["FDA CAERS", "MedWatch recalls", "FDA Import Alerts", "FTC complaint records"],
    intakeSources: ["Internal AE tracking", "Contraindication documentation"],
  },
  transparency: {
    id: "transparency",
    label: "Brand Transparency",
    icon: "🔍",
    weight: 12,
    // We can crawl websites for claim accuracy and public CoA access.
    // Deeper sourcing disclosures and endorsement transparency require brand input.
    publicMax: 7,
    intakeBonus: 5,
    tooltip: "Honest claims, accessible testing data, and no hidden promotions.",
    publicSources: ["Website claim crawler", "Public CoA accessibility check", "Marketing claim NLP"],
    intakeSources: ["Sourcing documentation", "Endorsement disclosures", "Clinical affiliate audit"],
  },
  sustainability: {
    id: "sustainability",
    label: "Sustainability & Ethics",
    icon: "🌿",
    weight: 8,
    // B-Corp status and public ethics claims are checkable. Everything
    // beyond requires supply chain documentation.
    publicMax: 4,
    intakeBonus: 4,
    tooltip: "Responsible sourcing, packaging, and ethical manufacturing practices.",
    publicSources: ["B-Corp registry", "Website ethics claims"],
    intakeSources: ["Supply chain documentation", "Third-party ethics audits"],
  },
};

// Aggregate caps
export const AI_INFERRED_MAX = Object.values(DIMENSION_CAPS)
  .reduce((sum, d) => sum + d.publicMax, 0);   // = 79 with current values

export const VERIFIED_MAX = Object.values(DIMENSION_CAPS)
  .reduce((sum, d) => sum + d.weight, 0);       // = 100

export const TOTAL_INTAKE_BONUS = Object.values(DIMENSION_CAPS)
  .reduce((sum, d) => sum + d.intakeBonus, 0);  // = 21
```

**Note on the AI_INFERRED_MAX = 79:** with the current calibration, the friend's mockup claim of "AI Inference Score capped at ~72" is close but not exact. 79 is the honest ceiling if every public source returns maximally. Real-world products will score well below this because not all evidence, certs, and transparency signals are maximally present. Tune the caps in PR review, not in this first pass.

### 1.3 Update `product-scoring.ts` to support both modes

The existing `scoreProduct()` function needs to return two results when brand data is available. Wrap the existing logic and add a mode parameter.

```typescript
// src/lib/product-scoring.ts — additions

import { DIMENSION_CAPS, type DimensionId } from "./scoring/dimension-caps";

export type ScoreMode = "ai_inferred" | "verified";

export interface BrandSubmissionData {
  // Formulation
  bioavailability_forms?: Record<string, string>;      // ingredient → form
  synergy_rationale?: string;
  proprietary_blend_exposure?: Record<string, number>; // ingredient → mg
  // Manufacturing
  coa_uploaded_at?: string;
  facility_audit_report_uploaded_at?: string;
  testing_frequency?: "per_batch" | "monthly" | "quarterly" | "annually";
  // Transparency
  sourcing_documentation_uploaded_at?: string;
  endorsement_disclosure?: "all_disclosed" | "none" | "not_disclosed";
  // Sustainability
  supply_chain_docs_uploaded_at?: string;
  ethics_audit_report_uploaded_at?: string;
}

export interface ScoreInputs {
  product: ProductRow;
  ingredients: ProductIngredientRow[];
  certifications: CertificationRow[];
  manufacturer: ManufacturerRow | null;
  complianceFlags: ComplianceFlagRow[];
  brandSubmission?: BrandSubmissionData;  // new — when present, verified mode is computable
}

export interface DualScoreResult {
  ai_inferred: ComputedScore;    // always produced
  verified: ComputedScore | null; // only when brandSubmission is present
}

export function scoreProductDual(inputs: ScoreInputs): DualScoreResult {
  const ai = scoreProductInMode(inputs, "ai_inferred");
  const verified = inputs.brandSubmission
    ? scoreProductInMode(inputs, "verified")
    : null;
  return { ai_inferred: ai, verified };
}

// Renamed internal: scoreProduct → scoreProductInMode
// Keeps all existing logic but applies the cap per mode.
function scoreProductInMode(inputs: ScoreInputs, mode: ScoreMode): ComputedScore {
  // For each dimension, compute raw score as before, then apply cap.
  // ai_inferred: cap at DIMENSION_CAPS[d].publicMax
  // verified: cap at DIMENSION_CAPS[d].weight (i.e., full weight)
  //
  // The difference between modes is ONLY the cap — never the underlying
  // logic. This keeps the math transparent and testable.
  // ... implementation lifts from the existing single-mode scoreProduct
  //     but applies per-mode caps at the end of each dimension calculation.
}
```

Keep the old `scoreProduct()` exported as a thin wrapper that calls `scoreProductInMode(inputs, "ai_inferred")` so any existing callers don't break.

### 1.4 Rescore job — write both modes when applicable

Update `src/lib/scoring/rescore-job.ts` (built in Close-the-Loop) to write one or two rows per product:

```typescript
// In rescoreProducts():
const result = scoreProductDual(scoreInputs);

await upsertProductScore(productId, result.ai_inferred, "ai_inferred");
if (result.verified) {
  await upsertProductScore(productId, result.verified, "verified");
}

async function upsertProductScore(
  productId: string,
  score: ComputedScore,
  mode: ScoreMode,
) {
  // Mark any existing current row for this (product, mode) as non-current
  await sb.from("product_scores")
    .update({ is_current: false })
    .eq("product_id", productId)
    .eq("score_mode", mode)
    .eq("is_current", true);

  // Insert new current row
  await sb.from("product_scores").insert({
    product_id: productId,
    score_mode: mode,
    integrity_score: score.integrity_score,
    tier: score.tier,
    evidence_score: score.evidence.score,
    // ... rest of dimension sub-scores
    is_current: true,
    scored_at: new Date().toISOString(),
  });
}
```

---

## 2. Gap Report — pure function, zero new data

The gap report is trivial: for each dimension, compare the product's current AI-inferred sub-score to the verified cap. Surface the upside.

New file: `src/lib/scoring/gap-report.ts`

```typescript
import { DIMENSION_CAPS, type DimensionId } from "./dimension-caps";

export interface DimensionGap {
  id: DimensionId;
  label: string;
  currentScore: number;
  publicMax: number;
  intakeBonus: number;
  upside: number;          // how many points verification could unlock for this dim
  requiredEvidence: string[]; // what the brand needs to submit
}

export interface GapReport {
  aiScore: number;           // current ai_inferred integrity score
  potentialScore: number;    // what the brand could achieve with full verification
  totalUpside: number;       // potentialScore - aiScore
  dimensions: DimensionGap[];
  topOpportunities: DimensionGap[]; // 3 highest-upside dimensions
}

export function calculateGapReport(
  currentSubScores: Record<DimensionId, number>,
): GapReport {
  const dimensions: DimensionGap[] = Object.values(DIMENSION_CAPS).map((cap) => {
    const currentScore = currentSubScores[cap.id] ?? 0;
    const maxIfPerfect = cap.weight;
    // Assume public data is maxed (best case) and measure upside from intake
    const upside = Math.min(
      cap.intakeBonus,
      maxIfPerfect - Math.min(currentScore, cap.publicMax),
    );
    return {
      id: cap.id,
      label: cap.label,
      currentScore,
      publicMax: cap.publicMax,
      intakeBonus: cap.intakeBonus,
      upside,
      requiredEvidence: cap.intakeSources,
    };
  });

  const aiScore = Object.values(currentSubScores).reduce((a, b) => a + b, 0);
  const totalUpside = dimensions.reduce((sum, d) => sum + d.upside, 0);
  const topOpportunities = [...dimensions]
    .filter((d) => d.upside > 0)
    .sort((a, b) => b.upside - a.upside)
    .slice(0, 3);

  return {
    aiScore,
    potentialScore: aiScore + totalUpside,
    totalUpside,
    dimensions,
    topOpportunities,
  };
}
```

Surface this in two places: on the public scorecard (when viewing AI Inferred mode, show a CTA block at the bottom) and in the brand portal dashboard (as the opening hero).

---

## 3. Scorecard UI V2

Redesign of `src/app/products/[slug]/page.tsx`. The goal is not to re-skin but to adopt the mockup's information architecture — while keeping Vyvata's existing visual tokens and not forking the design system.

### 3.1 Structure changes

Replace the current single-page render with this layout:

```
┌──────────────────────────────────────────────────────────┐
│ STICKY NAV                                               │
│ Vyvata / Creatine / Momentous Creatine    [Share] [+Stack]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  HERO (grid: content | ring)                             │
│  • Brand badge + score mode pill + category              │
│  • Product name H1                                       │
│  • Serving, price, last-scored                           │
│  • Certifications chips                                  │
│  • [AI Score] [Verified Score] toggle (if both exist)    │
│                          │ ScoreRing (animated)          │
│                          │ Tier label                    │
│                          │ Data completeness %           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  SCORE HISTORY TIMELINE                                  │
│  Oct 2025 → Jan 2026 → Apr 2026                          │
│  Delta label ("+6 pts since Oct 2025")                   │
├──────────────────────────────────────────────────────────┤
│  TABS: Overview · Evidence · Formulation · Data Sources  │
│                                                          │
│  Tab content ...                                         │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  GAP REPORT (only in ai_inferred mode, only if upside>0) │
│  "This product could score up to 94 with verification"   │
│  [+8 Formulation] [+5 Transparency] [+4 Sustainability]  │
│  [Submit for Verification →]                             │
├──────────────────────────────────────────────────────────┤
│  RELATED PRODUCTS (same category, top 3 by score)        │
│  Mini rings + tier badges + brand                        │
├──────────────────────────────────────────────────────────┤
│  FOOTER CTA                                              │
│  "Get My Personalized Recommendation" → quiz             │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Component decomposition

Create these files (all client components where noted):

```
src/app/products/[slug]/
  page.tsx                    (server component — data loading + metadata)
  ProductScorecard.tsx        (client — the scorecard render)
  components/
    ScorecardNav.tsx          (client — sticky nav, share, add-to-stack)
    ScorecardHero.tsx         (client — brand, name, toggle, score ring)
    ScoreRing.tsx             (client — animated SVG ring)
    AnimatedScore.tsx         (client — count-up number)
    ScoreHistoryTimeline.tsx  (server — static render from rows)
    ScorecardTabs.tsx         (client — tab state)
    tabs/
      OverviewTab.tsx         (server)
      EvidenceTab.tsx         (server)
      FormulationTab.tsx      (server)
      DataSourcesTab.tsx      (server)
    GapReportBlock.tsx        (server — surfaces when ai mode + upside>0)
    RelatedProducts.tsx       (server — queries + renders)
    ScoreModeBadge.tsx        (server — tier + mode pill)
    DimensionBar.tsx          (client — bar with hover)
```

Keep client components as shallow as possible — most of the UI is static for a given product and should be server-rendered for SEO.

### 3.3 Visual tokens — extend existing, don't replace

Your existing tokens are correct. Add only the Elite tier color:

```typescript
// src/lib/tokens.ts (create if missing, or add to existing)
export const VYVATA_TOKENS = {
  // Existing
  db: "#0B1F3B",
  db2: "#0d2545",
  db3: "#112a52",
  teal: "#14B8A6",
  tealDim: "rgba(20,184,166,0.10)",
  tealMid: "rgba(20,184,166,0.25)",
  tealGlow: "rgba(20,184,166,0.45)",
  gold: "#F0C060",
  goldDim: "rgba(240,192,96,0.12)",
  red: "#FF6B6B",
  redDim: "rgba(255,107,107,0.11)",

  // NEW — Elite tier + AI mode accent
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.11)",
  blue: "#60a5fa",        // for AI-inferred mode indicators
  blueDim: "rgba(96,165,250,0.11)",
};
```

Tier colors:
- **Elite (90-100):** `purple` — currently unused, claim it for the top tier
- **Verified (75-89):** `teal`
- **Standard (60-74):** `gold`
- **Rejected (0-59):** `red`

### 3.4 Score mode toggle

When a product has both ai_inferred and verified score rows, show a toggle:

```tsx
// ScorecardHero.tsx (excerpt)
{hasBothModes && (
  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
    <button
      onClick={() => setMode("ai_inferred")}
      style={pillButton(mode === "ai_inferred", VYVATA_TOKENS.blue)}
    >
      ⚡ AI Score ({aiScore.integrity_score})
    </button>
    <button
      onClick={() => setMode("verified")}
      style={pillButton(mode === "verified", VYVATA_TOKENS.teal)}
    >
      ✓ Verified Score ({verifiedScore.integrity_score})
    </button>
  </div>
)}
```

The toggle is a pure client-side state switch — both score rows are loaded server-side in the same query, so switching is instant.

### 3.5 Tabs content

**Overview tab:** dimension breakdown bars (with hover tooltips), evidence snapshot stats (RCT count, meta-analyses, grade, effect size), certifications + flags, Vyvata Review Note.

**Evidence tab:** full clinical evidence summary — 6 stat cards, grade explanation block (A/B/C with descriptions), primary outcome narrative, evidence score breakdown bar.

**Formulation tab:** ingredient analysis table (name, dose, form, evidence grade per ingredient, Vyvata note per ingredient), formulation checklist (bioavailable forms, clinical dosing, no proprietary blends, synergy present).

**Data Sources tab:** every source that fed into the score, grouped by dimension. Public sources in blue pills, intake sources in teal pills. Status column (verified / clean / n/a). Bottom: "Zero-Assumption Rule" explainer block.

### 3.6 Score history timeline

Query:

```sql
SELECT scored_at, integrity_score, tier
FROM product_scores
WHERE product_id = $1 AND score_mode = $2
ORDER BY scored_at DESC
LIMIT 5;
```

Render as horizontal timeline with date → score transitions, largest font on the current/most recent, delta label calculated from first to last ("+6 pts since Oct 2025").

This feature becomes immediately meaningful the first time Close-the-Loop's rescore job runs and produces a new row with a different score — the history shows the move automatically.

### 3.7 Related products

Same-category query:

```typescript
async function getRelatedProducts(categoryId: string, excludeProductId: string) {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("products")
    .select(`
      id, slug, brand, name,
      product_scores!inner (integrity_score, tier, score_mode)
    `)
    .eq("category", categoryId)
    .eq("status", "active")
    .eq("product_scores.is_current", true)
    .eq("product_scores.score_mode", "verified")   // prefer verified over ai
    .neq("id", excludeProductId)
    .order("product_scores.integrity_score", { ascending: false })
    .limit(3);
  return data ?? [];
}
```

If fewer than 3 verified products exist in the category, fall back to ai_inferred to fill the slots. Render each as a mini ring + tier badge + brand + product name, clickable to their scorecard.

### 3.8 What to delete from the current scorecard

- The single-column render where score ring is inline at top — replaced by grid hero.
- Any hardcoded demo strings from initial development.
- The "ALL PRODUCTS" back link in the current nav — replaced by breadcrumb.

Keep everything else that's already working — it's mostly additive.

---

## 4. Brand Submission Portal

The biggest single chunk of work in this plan. Creates a real engagement loop for brands and becomes the business's eventual revenue channel.

### 4.1 Schema

New migration: `supabase/migrations/20260420_brand_submissions.sql`

```sql
-- Migration: Brand Submission Portal
-- Created: 2026-04-20
-- Purpose: Allow brands to submit product documentation for Verified scoring.
-- Related: docs/UI-V2-AND-SUBMISSION-PLAN.md

-- ══════════════════════════════════════════════════════════════
-- 1. Brand accounts (separate auth tier from practitioners)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.brand_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_role TEXT,

  -- Link to manufacturers table when resolvable
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,

  -- Verification
  email_verified_at TIMESTAMPTZ,
  domain_verified BOOLEAN DEFAULT false,  -- optional future: DNS TXT record

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_accounts_email ON public.brand_accounts (email);
CREATE INDEX idx_brand_accounts_manufacturer ON public.brand_accounts (manufacturer_id);

-- ══════════════════════════════════════════════════════════════
-- 2. Brand sessions (magic-link auth, same pattern as practitioners)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.brand_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id UUID NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,          -- stored as hash in practice
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_sessions_token ON public.brand_sessions (token);
CREATE INDEX idx_brand_sessions_account ON public.brand_sessions (brand_account_id, expires_at DESC);

-- ══════════════════════════════════════════════════════════════
-- 3. Product submissions
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id UUID NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

  -- Product identity (if new product, these populate before linking to products table)
  claimed_brand TEXT,
  claimed_product_name TEXT,
  claimed_sku TEXT,

  -- Submission data (the form content)
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- File references (paths in Supabase Storage)
  file_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Shape: [{ kind: 'coa' | 'clinical_study' | 'sourcing_doc' | 'ethics_audit', path, uploaded_at }]

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'reviewing', 'approved', 'rejected', 'needs_revision')),
  submitted_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  reviewer_email TEXT,

  -- If approved, which submission_data unlocks which verified score
  verified_score_applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_brand ON public.product_submissions (brand_account_id, status);
CREATE INDEX idx_submissions_product ON public.product_submissions (product_id);
CREATE INDEX idx_submissions_status ON public.product_submissions (status, submitted_at DESC);

-- ══════════════════════════════════════════════════════════════
-- 4. RLS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.brand_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY service_brand_accounts ON public.brand_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_brand_sessions ON public.brand_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_submissions ON public.product_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated brands read their own data (via JWT claim or session lookup in app code)
-- Anon cannot see any of these tables
```

### 4.2 Auth flow

Reuse the magic-link pattern already built for consumers at `src/app/auth/magic-link/`. New routes:

- `POST /api/brand/auth/request` — email in, magic link emailed out via Resend
- `GET /api/brand/auth/callback?token=...` — token validated, `vv_brand_token` httpOnly cookie set (30d), redirect to `/brand/dashboard`
- `POST /api/brand/auth/signout` — clear cookie

First-time email = auto-create `brand_accounts` row with `status='pending'` (admin approves in next step).

### 4.3 Routes to build

```
src/app/
  submit/
    page.tsx                          — public landing: "Submit your product for verification"
                                        auto-fills from slug query param if ?product=slug
  brand/
    login/
      page.tsx                        — magic-link request form
    verify/
      page.tsx                        — magic-link callback landing
    dashboard/
      page.tsx                        — server component: list of submissions + products + gap reports
      DashboardClient.tsx             — client: submission cards, "new product" CTA
    submissions/
      new/
        page.tsx                      — new product submission wizard
      [id]/
        page.tsx                      — edit a draft, view status of submitted
        SubmissionEditor.tsx          — client: multi-step form
  api/
    brand/
      auth/
        request/route.ts              — magic-link email send
        callback/route.ts             — token → cookie
        signout/route.ts              — clear cookie
      submissions/
        route.ts                      — GET (list own), POST (create draft)
        [id]/
          route.ts                    — GET, PATCH (save draft), DELETE
          submit/route.ts             — POST: transition draft → submitted
          upload/route.ts             — POST: file upload, returns Storage path
  admin/
    submissions/
      page.tsx                        — review queue
      AdminSubmissionsClient.tsx      — client: list, approve/reject actions
    api/
      submissions/
        [id]/
          approve/route.ts            — POST: transition to approved, trigger rescore
          reject/route.ts             — POST: transition to rejected with reason
          request-revision/route.ts   — POST: transition to needs_revision
```

### 4.4 The submission form

Pre-populated from public data wherever possible. Four sections matching the mockup:

**Section 1 — Product Identity** (most fields pre-filled from DSLD):
- Product name & SKU
- Brand name (disabled, pre-filled)
- Category
- Full ingredient list with exact doses (pre-filled; user corrects and confirms)
- Bioavailability form of each active ingredient

**Section 2 — Manufacturing Evidence:**
- Third-party certifications held (checkboxes: NSF Sport, USP Verified, Informed Sport, Informed Choice, BSCG — pre-checked from public registry matches)
- Certificate of Analysis (PDF upload)
- Testing frequency (per batch / monthly / quarterly / annually)
- Facility audit report (PDF upload)

**Section 3 — Clinical Evidence:**
- Primary intended health outcome (text)
- Product-specific clinical studies (PDF upload or PubMed URLs)
- Study summary (text)

**Section 4 — Safety & Transparency:**
- Known contraindications & interactions (textarea)
- Ingredient sourcing documentation (PDF upload)
- Paid endorsements disclosed? (yes/no/n-a)
- Supply chain origin (optional)

Each field in the form should show which scoring dimension it affects as a small subtitle: *"Affects: Manufacturing integrity."* This is visible in the mockup and worth keeping — it makes the relationship between submission work and score upside obvious.

Form validation: Zod schemas in `src/lib/brand-submission/schemas.ts` — required vs optional aligns with which fields gate which intake bonuses.

### 4.5 File upload

Use Supabase Storage. Create a bucket: `brand-submissions` with private access. Paths: `brand-submissions/{brand_account_id}/{submission_id}/{file_kind}-{timestamp}.pdf`.

API route `POST /api/brand/submissions/[id]/upload`:
- Auth: check `vv_brand_token` cookie maps to a brand_account that owns the submission
- Multipart form-data, single file, 10MB max, PDF only (or images for CoA photos)
- Uploads to Storage, writes reference into `submission_data.file_references` JSONB
- Returns `{ path, uploaded_at }`

Client component uses a dropzone (`react-dropzone` or vanilla drag-drop) with upload progress.

### 4.6 Admin approval flow

`/admin/submissions` lists pending submissions. For each:

- Brand + product claim
- Diff view: public data → what the brand claims differs
- Uploaded files (each openable in new tab)
- AI Inferred score → predicted Verified score (calls `scoreProductDual` hypothetically)
- Buttons: Approve / Reject / Request Revision
- Notes field for the brand to see

**On approve:**
1. `product_submissions.status = 'approved'`
2. If `product_id` is null (new product), create a `products` row
3. Merge `submission_data` into the product's brand-submitted data store
4. Trigger rescore for this product (calls `/api/admin/products/{id}/rescore`)
5. Send Resend notification to brand: "You're Verified. View your scorecard →"

**On reject:**
1. Status updates, reason stored in `reviewer_notes`
2. Resend email with explanation
3. Brand can still see submission, cannot edit

**On request-revision:**
1. Status = `needs_revision`, reason stored
2. Brand can edit and re-submit
3. Loops back to `reviewing` on re-submit

### 4.7 Brand dashboard

`/brand/dashboard` shows:

- Hero: "You have N products. X are Verified, Y are AI Inferred."
- For each product:
  - Mini scorecard (name, tier, current score, score_mode)
  - Gap report summary: "Verify this product to unlock +Z points"
  - CTA: "Continue draft" / "Submit" / "View status"
- "New product submission" button
- Account settings (contact, logout)

---

## 5. Testing

**Schema/migration tests:**
- Apply `20260420_score_mode.sql` and `20260420_brand_submissions.sql` to a fresh Supabase local instance, assert all tables/indexes/policies present.

**Scoring logic tests:**
- Unit: given ingredients + certs + flags, `scoreProductDual({...})` returns `ai_inferred.integrity_score <= AI_INFERRED_MAX` and `verified.integrity_score <= VERIFIED_MAX`.
- Unit: given brand submission with all intake bonuses satisfied, `verified.integrity_score` equals the raw dimension sum capped by `weight`.
- Unit: `calculateGapReport(subScores)` — for a known product, assert `totalUpside` equals sum of dimension upsides.

**Auth tests:**
- Magic-link round trip: request → token → cookie → session → authenticated request.

**Flow tests (Playwright):**
- Brand signs up → creates submission → fills form → uploads CoA → submits.
- Admin reviews → approves → product gets verified score row → scorecard shows Verified Score tab and tier color flip.

---

## 6. Deliverables checklist

### Data model
- [ ] `supabase/migrations/20260420_score_mode.sql`
- [ ] `supabase/migrations/20260420_brand_submissions.sql`
- [ ] `src/lib/scoring/dimension-caps.ts` — calibrated dimension caps
- [ ] `src/lib/product-scoring.ts` — `scoreProductDual`, per-mode capping

### Gap Report
- [ ] `src/lib/scoring/gap-report.ts` — pure function
- [ ] `src/app/products/[slug]/components/GapReportBlock.tsx` — UI surface

### Scorecard UI V2
- [ ] Restructure `src/app/products/[slug]/page.tsx` into server/client split
- [ ] `ProductScorecard.tsx` + 12 child components listed in 3.2
- [ ] `src/lib/tokens.ts` — add `purple`, `purpleDim`, keep others
- [ ] Score mode toggle wired to both score rows
- [ ] Score history timeline rendered from `product_scores` history rows
- [ ] Tabs: Overview / Evidence / Formulation / Data Sources
- [ ] Related products section (same-category query)

### Rescore integration
- [ ] Update `src/lib/scoring/rescore-job.ts` to write both modes when applicable
- [ ] Trigger rescore on `product_submissions` status transition to `approved`

### Brand Portal
- [ ] All 17 routes listed in 4.3
- [ ] Magic-link auth flow (request → callback → session)
- [ ] Supabase Storage bucket `brand-submissions` with private access
- [ ] File upload API with 10MB / PDF validation
- [ ] Submission form (4 sections) with Zod validation
- [ ] Brand dashboard with gap report integration
- [ ] Admin review UI at `/admin/submissions`
- [ ] Resend email templates: magic link, submission received, approved, rejected, needs revision

### Testing
- [ ] Scoring unit tests (AI vs Verified ceiling)
- [ ] Gap report unit tests
- [ ] Magic-link auth round trip
- [ ] Submission E2E (Playwright)

---

## What NOT to do

- **Do not discard the mockup's informational architecture** in favor of something new. The tabs / hero / timeline / related products flow is well-considered; lift it straight.
- **Do not adopt the mockup's hardcoded dimension caps without calibration.** The numbers in the friend's code are illustrative, not authoritative. `dimension-caps.ts` is the calibration layer — tune it during PR review.
- **Do not combine AI and Verified into one score row with two columns.** Two rows with `score_mode` keeps history clean, toggle behavior simple, and lets each mode evolve independently.
- **Do not make the brand portal an extension of practitioner auth.** Different tier, different permissions, different UI. Reuse the magic-link *pattern*, not the *tables*.
- **Do not auto-approve submissions.** Every verified score transition is a human review. A bad approval (i.e., trusting a bogus CoA) is a credibility hit you can't undo.
- **Do not skip the "Affects: [dimension]" subtitles on form fields.** The mockup does this well — it makes the relationship between submission work and score upside legible.

---

## What success looks like after ~3-4 weeks

- A brand lands on their product's `/products/[slug]` scorecard, sees "AI Inferred 62/100", clicks "Submit for Verification", fills the form (most fields pre-populated), uploads three PDFs, submits.
- You review in admin, click approve, and 30 seconds later their scorecard flips to "Verified 87/100" with tier Purple/Elite.
- They post the URL on LinkedIn. The trading-card OG renders with the Verified badge.
- Another brand sees it, googles their own brand, hits their own AI Inferred scorecard, sees the gap report, and starts their own submission.
- Score history on the scorecard now shows "October: 62 (AI) → April: 87 (Verified)" — a legible story of a brand improving visibly.

That's the loop.

---

*Last updated: 2026-04-20*

---

## Completion log — Phases 1 & 2 (2026-04-18/19)

Phases 1 and 2 of this plan are complete. Phase 3 (brand submission portal)
is the remaining chunk and is explicitly its own multi-session project.

### Phase 1 — Two-path scoring + gap report (commits `e08dd27`, subsequent)

- `supabase/migrations/20260420_score_mode.sql` — adds `score_mode` column,
  replaces the `(product_id, is_current)` uniqueness index with one scoped
  by `(product_id, score_mode)` so both modes can coexist on the same
  product, and re-scopes `ensure_single_current_score` trigger to match
- `src/lib/scoring/dimension-caps.ts` — per-dimension publicMax vs weight
  calibration. AI_INFERRED_MAX = 79 (honest public-data ceiling),
  VERIFIED_MAX = 100 (full weight, unlocked by brand submission)
- `src/lib/product-scoring.ts` — `scoreProductDual()` returns both modes;
  legacy `scoreProduct()` preserved as backward-compat wrapper returning
  verified-mode (matches prior behavior exactly)
- `src/lib/scoring/gap-report.ts` — pure `calculateGapReport()` returning
  per-dim upside + top 3 opportunities by point gain
- `src/lib/scoring/rescore-job.ts` — writes both modes when a brand
  submission is present; only ai_inferred otherwise
- `src/components/GapReportBlock.tsx` — CTA block on the scorecard when
  score_mode is ai_inferred and upside ≥ 1 point. Links to a `mailto:`
  submission — real portal lands in Phase 3
- Score mode pill in the hero (⚡ AI Inferred / ✓ Verified)

**Deliberate deviation:** skipped `scoreProductVerified()` helper from the
plan — YAGNI since the legacy `scoreProduct()` already behaves as the full-
weight scorer.

### Phase 2 — Scorecard UI V2 (commits `03dc182`, `8e4dc2a`, subsequent)

- `src/lib/tokens.ts` — shared design tokens. Elite tier elevated to purple
  (`#a78bfa`); verified/standard/rejected unchanged. Migrated all five
  surfaces (/products, scorecard, ProductRecommendations, AdminProducts,
  OG image) to the shared TIER_COLOR map
- `src/components/scorecard/ScoreRing.tsx` — animated SVG ring with
  count-up number, tier color, mode pill
- `src/components/scorecard/ScoreHistoryTimeline.tsx` — horizontal timeline
  of last 5 `product_scores` rows for the active mode with "+N pts since X"
  delta label
- `src/components/scorecard/RelatedProducts.tsx` — same-category top 3,
  preferring verified-mode scores over ai_inferred
- `src/components/scorecard/ScoreModeToggle.tsx` — URL-driven mode toggle
  (`?mode=ai`) that shows only when both modes exist
- `src/components/scorecard/ScorecardTabs.tsx` — client tab shell; four
  server-rendered panels passed as children (Overview / Evidence /
  Formulation / Data Sources)
- `src/app/products/[slug]/page.tsx` restructured: hero grid with identity
  + ring, score history, compliance flags banner, tabs, gap report, related
  products, share. Evidence tab pulls from `EVIDENCE_SUMMARIES` matched
  against each product's ingredient names

**Deliberate deviations:**

- Inlined the four tab-panel functions (`OverviewPanel`, `EvidencePanel`,
  `FormulationPanel`, `DataSourcesPanel`) in `[slug]/page.tsx` instead of
  13 separate component files per the plan's 3.2 decomposition. Kept the
  page under ~500 lines while preserving the same information architecture
- Kept the compliance-flags banner outside the tabs — unresolved FDA
  enforcement needs the urgency of top-level placement, not a "oh look in
  the Safety tab" moment

### OG image + share pipeline — collateral work

The Facebook share pipeline broke twice during Phase 2 rollout and the
debug loop was painful enough to warrant its own log here.

**Bug 1 — localhost URL in og:image.** `NEXT_PUBLIC_APP_URL` wasn't set in
prod Vercel; my metadata fell back to `http://localhost:3000`; Facebook
reported "Bad Response Code" because it was fetching localhost. Fixed by
a 4-step fallback chain in `src/lib/urls.ts` (`getAppBaseUrl()`):
NEXT_PUBLIC_APP_URL → VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL →
`https://vyvata.com`. Never localhost.

**Bug 2 — silent Satori render crash on scored products.** Satori (the
engine behind `next/og`) returned 200 OK + `Content-Length: 0` on a
specific style combo in the tier pill: solid-hex background + dark text +
`borderRadius: 999` + small padding + small font, all at once. Bisected
with a `?debug=noscore` query flag that forced the fallback branch.
Replaced the pill with plain tier-colored text; crash gone.

**Bug 3 — protocol OG route (`/api/og`) hit a different Satori trigger.**
A `<div>` with mixed text and a `<span>` child without `display: flex`
crashed the same way. Refactored to flex-with-two-child-divs.

**Lessons encoded in the codebase:**

- `scripts/test-og-smoke.ts` — smoke test with one probe per tier
  (elite/verified/standard/rejected) plus fallback and protocol OG
  probes. `npm run smoke:og` runs it. Each probe asserts HTTP 200,
  `image/*` content-type, PNG magic bytes, and size ≥ 10KB. Would have
  caught all three bugs in 5 seconds
- `src/app/api/og/product/route.tsx` has a doc comment block at the top
  listing the two confirmed Satori crash triggers so future edits don't
  silently re-trip them
- Cache headers on both OG routes:
  `max-age=3600, s-maxage=86400, stale-while-revalidate=604800`. Facebook
  and LinkedIn scrapers don't retry on misses, so default Next
  `max-age=0, must-revalidate` is actively bad for OG endpoints
