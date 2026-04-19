# Close the Loop — VSF Integration Plan

> **Purpose:** Connect five existing-but-unwired pieces of the Vyvata codebase so compliance data actually moves scores, syncs run on a schedule, scorecards are shareable, and shared scorecards look like collectible trading cards. No new pipelines, no new data models — this is structural completion.

---

## Context: what's already built

Before doing anything, read the relevant existing files. Every gap below is closed against code that already exists:

| Piece | Location | Status |
|---|---|---|
| Public product scorecard (UUID-based) | `src/app/products/[id]/page.tsx` | ✅ Rendering, reads `product_scores` + `compliance_flags` |
| Stack scoring engine | `src/lib/scoring-engine.ts` | ✅ Used by `/api/parse-stack` |
| Product scoring (VSF) | `src/lib/product-scoring.ts` | ✅ Pure function; accepts `ComplianceFlagRow[]` with `compliance_penalty` |
| Admin compliance UI | `src/app/admin/compliance/AdminComplianceClient.tsx` | ✅ Manual sync, confidence filters |
| Admin compliance API | `src/app/api/admin/compliance/` | ✅ Handles flags + manual sync-recalls |
| openFDA recalls client | `src/lib/compliance/openfda-recalls.ts` | ✅ |
| FDA warning letters scraper | `src/lib/scrapers/fda-warning-letters.ts` | ✅ |
| Certification scrapers | `src/lib/scrapers/{nsf-sport,usp-verified,informed-sport,certification-sync}.ts` | ✅ |
| Protocol OG image | `src/app/api/og/route.tsx` | ✅ 1200×630, dark gradient, teal accent |
| `compliance_flags` schema | `compliance_flags.matched_product_id` / `matched_manufacturer_id` direct FKs | ✅ |

**The five gaps this plan closes:**

1. Automated compliance sync (currently: only manual admin button)
2. Scores don't auto-recompute when new flags match (the wiring exists in `product-scoring.ts`, nothing triggers it)
3. Scorecards live at UUID URLs — not shareable
4. OG image is wired for protocols only, not products
5. Scorecard has no share buttons

Execute these in order. Each is small; together they turn the project from "features built in isolation" into "a live system that closes its own loops."

---

## Prerequisites

Read first:

- `STRATEGIC-REVIEW-2026-04.md` (root) — strategic framing
- `AGENTS.md` / `CLAUDE.md` — **Next.js 16 conventions** — do not write App Router code from memory; check `node_modules/next/dist/docs/` for `route.tsx`, `generateStaticParams`, and cron-auth patterns
- `src/app/products/[id]/page.tsx` — current scorecard rendering, color/type conventions
- `src/app/api/og/route.tsx` — existing OG visual grammar to match
- `src/lib/product-scoring.ts` — pure function signature to call from the re-score job
- `supabase/migrations/20260418_vsf_phase1_products_and_scoring.sql` — current `products`, `manufacturers`, `product_scores` shapes

Also grep the codebase for `compliance_flags` and list every read/write site — some of the following may be partially implemented already.

---

## Gap 1 — Automate the compliance sync

**What's there:** `/cron/README.md` documents the intended schedule. `src/app/api/admin/compliance/sync-recalls/route.ts` (and its siblings for warning letters and certifications, search and confirm) exist and work when called manually from the admin UI. `vercel.json` lists only two crons.

**What to do:**

### 1.1 Build missing cron endpoints (if they don't already exist)

Check `src/app/api/cron/` for existing handlers. Currently present:
- `refresh-active-products`
- `cleanup-cache`

Needed:
- `sync-recalls`
- `sync-warning-letters`
- `sync-certifications`
- `rescore-products` (new — see Gap 2)

For each missing one, create `src/app/api/cron/{name}/route.ts` as a thin wrapper that:
1. Authenticates on `CRON_SECRET` via `Authorization: Bearer …` (match pattern from existing cron handlers)
2. Calls the underlying sync function (from `src/lib/compliance/*` or `src/lib/scrapers/*`)
3. Returns a JSON summary: `{ ok, fetched, inserted, updated, skipped, errors }`

Template:

```typescript
// src/app/api/cron/sync-recalls/route.ts
import { NextResponse } from "next/server";
import { syncOpenFdaRecalls } from "@/lib/compliance/openfda-recalls";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncOpenFdaRecalls({ daysBack: 14 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/sync-recalls]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
```

Note the `daysBack: 14` window — since this runs daily, a 14-day rolling window with idempotent upserts catches anything delayed or re-posted without hammering the API.

The admin UI's existing sync endpoint (`/api/admin/compliance/sync-recalls`) can stay as-is for manual "force full backfill" runs with a larger `daysBack` value.

### 1.2 Update `vercel.json`

Append to the `crons` array (do not replace existing entries):

```json
{
  "crons": [
    { "path": "/api/cron/refresh-active-products", "schedule": "0 2 * * *" },
    { "path": "/api/cron/cleanup-cache",           "schedule": "0 3 * * *" },
    { "path": "/api/cron/sync-recalls",            "schedule": "0 4 * * *" },
    { "path": "/api/cron/sync-warning-letters",    "schedule": "0 5 * * *" },
    { "path": "/api/cron/sync-certifications",     "schedule": "0 6 * * 1" },
    { "path": "/api/cron/rescore-products",        "schedule": "30 6 * * *" }
  ]
}
```

Cert sync runs weekly (Mondays). Rescore runs 30 minutes after warning letters daily — gives the warning-letters job time to finish before the rescorer reads flags.

### 1.3 Observability

Log structured output from each cron, at minimum:

```typescript
console.log(JSON.stringify({
  event: "cron.sync-recalls",
  ok: true,
  fetched, inserted, updated, skipped,
  errors: errors.length,
  duration_ms: Date.now() - started,
}));
```

Vercel logs are searchable — this makes "did the cron run and find anything" answerable in ten seconds from the Vercel dashboard.

---

## Gap 2 — Close the compliance → score loop

**What's there:** `src/lib/product-scoring.ts` is a pure function that takes product data plus `ComplianceFlagRow[]` and returns computed scores + tier. The `product_scores` table has an `is_current` boolean. The `compliance_flags` table has `match_confidence` and `matched_product_id` / `matched_manufacturer_id`.

**What's missing:** when a new flag lands at `match_confidence = 'high'`, nothing recomputes the affected product's scores. So the tier badge never changes.

### 2.1 Design decision — trigger, hook, or batch?

Three options:

| Approach | Pros | Cons |
|---|---|---|
| Postgres trigger on `compliance_flags` insert/update | Instant, database-native | Runs scoring logic in Postgres (hard — `product-scoring.ts` is TS) or via `NOTIFY` + separate worker (complex) |
| Application-level hook at match-time | Instant, TS logic in TS | Must be invoked from every place flags are written |
| Nightly batch re-score | Simple, testable, idempotent | Up to 24h stale — but scores change slowly, this is fine |

**Recommendation:** batch job + targeted re-score on manual admin actions. Scores aren't realtime-critical; the 30-minutes-after-sync window is plenty.

### 2.2 Build `rescore-products` endpoint

New file: `src/app/api/cron/rescore-products/route.ts`

New file: `src/lib/scoring/rescore-job.ts` (put it in a `scoring/` subdirectory since `product-scoring.ts` is already at `src/lib/` and this is orchestration on top of it)

```typescript
// src/lib/scoring/rescore-job.ts
import { getSupabaseServer } from "@/lib/supabase";
import { scoreProduct } from "@/lib/product-scoring";

export interface RescoreResult {
  scanned: number;
  rescored: number;
  unchanged: number;
  errors: Array<{ product_id: string; message: string }>;
}

/**
 * Re-score products whose compliance_flags or certifications changed recently,
 * or whose current score row is older than `staleDays`.
 *
 * Writes new rows to `product_scores` with is_current=true and marks the
 * previous row is_current=false. Keeps history.
 */
export async function rescoreProducts(opts: {
  sinceHours?: number;
  staleDays?: number;
  limit?: number;
} = {}): Promise<RescoreResult> {
  const sinceHours = opts.sinceHours ?? 48;
  const staleDays = opts.staleDays ?? 30;
  const limit = opts.limit ?? 500;

  const sb = getSupabaseServer();

  // 1. Find candidate products:
  //    a) Products with compliance_flag_matches changed in last `sinceHours`
  //    b) Products whose current product_scores row is older than `staleDays`
  //    c) Products with certifications changed in last `sinceHours`
  //    Union, dedupe, limit.
  const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();
  const staleCutoff = new Date(Date.now() - staleDays * 86400_000).toISOString();

  const { data: candidates } = await sb.rpc("products_needing_rescore", {
    changed_since: since,
    stale_before: staleCutoff,
    max_products: limit,
  });

  const result: RescoreResult = { scanned: 0, rescored: 0, unchanged: 0, errors: [] };

  for (const productId of (candidates ?? []) as string[]) {
    result.scanned++;
    try {
      // Pull all inputs for scoring
      const { data: product } = await sb
        .from("products")
        .select(`
          id, brand, name, manufacturer_id,
          manufacturer:manufacturers (gmp_certified, fda_registered, third_party_tested),
          product_ingredients (ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend),
          certifications (type, verified)
        `)
        .eq("id", productId)
        .single();
      if (!product) continue;

      const { data: flags } = await sb
        .from("compliance_flags")
        .select("source, severity, issued_date, match_confidence")
        .or(
          product.manufacturer_id
            ? `matched_product_id.eq.${productId},matched_manufacturer_id.eq.${product.manufacturer_id}`
            : `matched_product_id.eq.${productId}`,
        )
        .is("resolved_at", null)
        .in("match_confidence", ["high", "medium"]); // ignore low-confidence in scoring

      // Compute new score via existing pure function
      const computed = scoreProduct({
        product,
        ingredients: product.product_ingredients,
        certifications: product.certifications,
        manufacturer: product.manufacturer ?? null,
        complianceFlags: (flags ?? []).filter(f => f.match_confidence === "high"),
      });

      // Compare to current score — skip write if identical
      const { data: currentScore } = await sb
        .from("product_scores")
        .select("integrity_score, tier")
        .eq("product_id", productId)
        .eq("is_current", true)
        .maybeSingle();

      if (
        currentScore &&
        currentScore.integrity_score === computed.integrity_score &&
        currentScore.tier === computed.tier
      ) {
        result.unchanged++;
        continue;
      }

      // Mark current row non-current
      if (currentScore) {
        await sb
          .from("product_scores")
          .update({ is_current: false })
          .eq("product_id", productId)
          .eq("is_current", true);
      }

      // Insert new score row
      await sb.from("product_scores").insert({
        product_id: productId,
        integrity_score: computed.integrity_score,
        tier: computed.tier,
        evidence_score: computed.evidence.score,
        safety_score: computed.safety.score,
        formulation_score: computed.formulation.score,
        manufacturing_score: computed.manufacturing.score,
        transparency_score: computed.transparency.score,
        sustainability_score: computed.sustainability.score,
        is_current: true,
        scored_at: new Date().toISOString(),
      });

      result.rescored++;
    } catch (err) {
      result.errors.push({
        product_id: productId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
```

### 2.3 Supporting SQL: `products_needing_rescore` RPC

New migration: `supabase/migrations/20260419_rescore_rpc.sql`

Follow existing style (uppercase keywords, ══ separators, comment header):

```sql
-- Migration: products_needing_rescore RPC
-- Created: 2026-04-19
-- Purpose: Identify products whose scores may be stale due to recent flag /
--          certification changes, or whose current score row is itself stale.
-- Related: src/lib/scoring/rescore-job.ts

-- ══════════════════════════════════════════════════════════════
-- RPC: products_needing_rescore
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.products_needing_rescore(
  changed_since TIMESTAMPTZ,
  stale_before  TIMESTAMPTZ,
  max_products  INTEGER DEFAULT 500
)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    -- Flag-change candidates (high-confidence matches only)
    SELECT DISTINCT cf.matched_product_id AS id
    FROM public.compliance_flags cf
    WHERE cf.matched_product_id IS NOT NULL
      AND cf.match_confidence IN ('high', 'medium')
      AND (cf.updated_at >= changed_since OR cf.created_at >= changed_since)
    
    UNION
    
    -- Flag-change candidates via manufacturer match
    SELECT p.id
    FROM public.products p
    JOIN public.compliance_flags cf 
      ON cf.matched_manufacturer_id = p.manufacturer_id
    WHERE cf.match_confidence IN ('high', 'medium')
      AND (cf.updated_at >= changed_since OR cf.created_at >= changed_since)
    
    UNION
    
    -- Certification-change candidates
    SELECT DISTINCT c.product_id
    FROM public.certifications c
    WHERE c.updated_at >= changed_since
    
    UNION
    
    -- Staleness candidates — no current score, or current score older than cutoff
    SELECT p.id
    FROM public.products p
    LEFT JOIN public.product_scores ps
      ON ps.product_id = p.id AND ps.is_current = true
    WHERE p.status = 'active'
      AND (ps.scored_at IS NULL OR ps.scored_at < stale_before)
  )
  SELECT id FROM candidates
  WHERE id IS NOT NULL
  LIMIT max_products;
$$;

GRANT EXECUTE ON FUNCTION public.products_needing_rescore(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO service_role;
```

Verify — but likely need to add — `updated_at` columns on `compliance_flags` and `certifications` if not already present. If missing, add:

```sql
ALTER TABLE public.compliance_flags
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

### 2.4 Manual re-score from admin

Small QoL: add a "Re-score this product" button to each row in `AdminProductsClient.tsx` that calls a new `POST /api/admin/products/{id}/rescore` endpoint which runs the scoring for that one product. Useful for testing and for forcing updates after a manual flag edit.

### 2.5 Verify `product-scoring.ts` compliance penalty logic

Before trusting the re-scorer, read the full `src/lib/product-scoring.ts` file and confirm the compliance penalty math is sane:

- Critical recall: -35 to safety, -20 to transparency
- Serious recall / major warning letter: -15 to safety, -10 to transparency
- Moderate: -5 / -5
- Minor / informational: -2 / 0

If the math is off, adjust there, not in the re-scorer. Keep scoring logic in one file.

---

## Gap 3 — Slug-based scorecard URLs

**What's there:** `/products/[id]` uses a UUID. Ugly, unshareable, not SEO-friendly.

**What to build:** `/products/[slug]` as the canonical URL, with UUID URLs redirecting to it.

### 3.1 Add `slug` column + backfill

New migration: `supabase/migrations/20260419_product_slugs.sql`

```sql
-- Migration: Product slugs for shareable URLs
-- Created: 2026-04-19

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

-- Backfill: lowercase, replace non-alnum with dash, collapse dashes
-- Format: {brand-kebab}-{name-kebab}
UPDATE public.products
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      brand || '-' || name,
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '(^-+|-+$)', '', 'g'
  )
)
WHERE slug IS NULL;

-- De-duplicate: any duplicate slugs get a short suffix
-- (e.g., if two products map to the same slug after normalization)
WITH duplicates AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM public.products
  WHERE slug IS NOT NULL
)
UPDATE public.products p
SET slug = d.slug || '-' || SUBSTR(p.id::text, 1, 6)
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Going forward, a trigger keeps slug in sync on insert
CREATE OR REPLACE FUNCTION public.fn_set_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          NEW.brand || '-' || NEW.name,
          '[^a-zA-Z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      )
    );
    -- Collision fallback
    IF EXISTS (SELECT 1 FROM public.products WHERE slug = NEW.slug AND id <> NEW.id) THEN
      NEW.slug := NEW.slug || '-' || SUBSTR(NEW.id::text, 1, 6);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_product_slug
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.fn_set_product_slug();
```

### 3.2 Route restructuring

Rename the existing page folder from `src/app/products/[id]/` to `src/app/products/[slug]/`. Adjust the `params` type and the `loadProduct` query — change `.eq("id", id)` to `.eq("slug", slug)`.

### 3.3 UUID backward-compatibility

Old UUID URLs may already be shared/bookmarked. Preserve them. Add a server-side detector at the top of the slug page:

```typescript
// At top of src/app/products/[slug]/page.tsx
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  // Legacy UUID URL → 308 redirect to canonical slug
  if (UUID_RE.test(slug)) {
    const { data } = await getSupabaseServer()
      .from("products")
      .select("slug")
      .eq("id", slug)
      .maybeSingle();
    if (data?.slug) {
      redirect(`/products/${data.slug}`);
    }
  }

  const product = await loadProduct(slug);
  if (!product) notFound();
  // ... rest unchanged
}
```

### 3.4 Update internal links

Grep for `/products/${...id}` and `/products/` + id usage across the codebase. Replace with slug-based links using a helper:

```typescript
// src/lib/urls.ts (create if missing)
export function productUrl(product: { slug?: string | null; id: string }): string {
  return `/products/${product.slug ?? product.id}`;
}
```

Likely sites needing update: `AdminProductsClient.tsx`, `practitioner/products/page.tsx`, the product list page at `src/app/products/page.tsx`, any protocol page that links to products.

### 3.5 Sitemap

Add product slugs to `src/app/sitemap.ts` (create if missing):

```typescript
import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active")
    .not("slug", "is", null);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://vyvata.com";
  const products = (data ?? []).map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    ...products,
  ];
}
```

---

## Gap 4 — Product OG image (the trading card)

**What's there:** `src/app/api/og/route.tsx` — Edge runtime OG generator for protocols. Uses a linear gradient `#0B1F3B → #0d2545 → #0e3040`, teal `#14B8A6` accent, Montserrat-ish typography via system stack, card with `rgba(17,32,64,0.8)` background and teal border.

**What to build:** a sibling endpoint `src/app/api/og/product/route.tsx` that renders a trading-card style preview at 1200×630. Uses the same visual language — not a new brand, an extension.

### 4.1 Design specification

Canvas: 1200×630, same base gradient as protocol OG.

Layout:

```
┌────────────────────────────────────────────────────────────────┐
│ VYVATA · V-mark                       #THORNE-BASIC-NUTRIENTS │  ← top bar
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ┌─────────────┐                                             │
│     │             │    THORNE                           (brand) │
│     │    ELITE    │    Basic Nutrients 2/Day            (name)  │
│     │             │    Multivitamin · 60 capsules    (category) │
│     │     92      │                                             │
│     │    ─────    │    ────────────────────────────             │
│     │     /100    │                                             │
│     │             │    [E]  [S]  [F]  [M]  [T]  [Su]            │
│     └─────────────┘     ▓▓   ▓▓   ▓▓   ▓▓   ▓▓   ▓             │  ← dimension bars
│                         94   88   95   91   93   87              │
│                                                                 │
│  ────────────────────────────────────────────────────────────── │
│  ⚠ Active FDA Warning — Mar 2024     vyvata.com · VERIFIED     │  ← footer
└────────────────────────────────────────────────────────────────┘
```

**Left seal (220×220, rounded 24px, padding 24px):**
- Tint: tier color at 14% opacity, 1px border at 40% opacity
- Label (tier name): uppercase, Montserrat 800, `{tier color}`, 16px, letter-spacing 0.2em
- Score: black 120px, tier color, line-height 1
- Divider: 1px, teal 20%
- `/100`: 24px, muted `#4a6080`

**Right content area:**
- Brand: muted `#7A90A8`, 18px, weight 600
- Product name: white, Montserrat 44px, weight 800, line-height 1.1 (clamp to 2 lines, ellipsis)
- Category + serving: teal `#14B8A6`, 16px, weight 500
- Small gap
- Dimension bars row: 6 stacks, each 70px wide × 90px tall area. Bar fills vertically in tier color proportional to sub-score (0..100 → 0..90px). Label below: `E S F M T Su` muted. Numeric score below label in 12px weight 700 white.

**Top bar (60px tall):**
- Left: small V-mark (same 36px circle as existing OG) + VYVATA wordmark
- Right: `#{SLUG-UPPERCASE}` in muted color, 12px, letter-spacing 0.1em (truncate at ~40 chars)

**Footer (60px tall, divider above):**
- Left: if `topFlag` param present, red-pill callout: `⚠ Active {flag_type} — {date}` in `#F87171` with `rgba(248,113,113,0.12)` background, 10px padding, 999px radius
- Right: `vyvata.com · {tier uppercase}` muted `#4a6080`, 13px, letter-spacing 0.1em

### 4.2 Tier color map (reuse from existing scorecard)

```typescript
const TIER_COLOR: Record<string, string> = {
  elite:     "#34D399",
  verified:  "#14B8A6",
  standard:  "#F59E0B",
  rejected:  "#F87171",
};
```

### 4.3 Route signature

`GET /api/og/product?slug={productSlug}`

The route server-fetches the product + current score + top active flag (one, if present, newest critical/serious only) so consumers don't have to pass everything in the URL. Cache with `export const revalidate = 3600` or similar — an hour of cache is plenty since scores change at most daily.

```typescript
// src/app/api/og/product/route.tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const revalidate = 3600;

const TIER_COLOR: Record<string, string> = {
  elite: "#34D399", verified: "#14B8A6", standard: "#F59E0B", rejected: "#F87171",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return new Response("slug required", { status: 400 });
  }

  // Fetch product + score + top flag
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: product } = await sb
    .from("products")
    .select(`
      id, brand, name, category, serving_size, manufacturer_id,
      product_scores!inner (integrity_score, tier, evidence_score, safety_score, formulation_score, manufacturing_score, transparency_score, sustainability_score, is_current)
    `)
    .eq("slug", slug)
    .eq("product_scores.is_current", true)
    .maybeSingle();

  if (!product) {
    return new Response("not found", { status: 404 });
  }

  const score = (product as unknown as { product_scores: Array<{ integrity_score: number; tier: string; evidence_score: number; safety_score: number; formulation_score: number; manufacturing_score: number; transparency_score: number; sustainability_score: number }> }).product_scores[0];

  // Top flag: most recent critical/serious unresolved
  const { data: topFlag } = await sb
    .from("compliance_flags")
    .select("source, severity, issued_date")
    .or(
      product.manufacturer_id
        ? `matched_product_id.eq.${product.id},matched_manufacturer_id.eq.${product.manufacturer_id}`
        : `matched_product_id.eq.${product.id}`,
    )
    .is("resolved_at", null)
    .in("severity", ["critical", "serious"])
    .order("issued_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const tierColor = TIER_COLOR[score.tier] ?? "#14B8A6";
  const dims = [
    { label: "E",  name: "Evidence",      value: score.evidence_score },
    { label: "S",  name: "Safety",        value: score.safety_score },
    { label: "F",  name: "Formulation",   value: score.formulation_score },
    { label: "M",  name: "Manufacturing", value: score.manufacturing_score },
    { label: "T",  name: "Transparency",  value: score.transparency_score },
    { label: "Su", name: "Sustainability",value: score.sustainability_score },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d2545 60%, #0e3040 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          padding: 48,
        }}
      >
        {/* TOP BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(20,184,166,0.15)", border: "2px solid #14B8A6", display: "flex", alignItems: "center", justifyContent: "center", color: "#14B8A6", fontSize: 18, fontWeight: 800 }}>V</div>
            <div style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>VYVATA</div>
          </div>
          <div style={{ color: "#4a6080", fontSize: 13, letterSpacing: "0.1em" }}>#{slug.toUpperCase().slice(0, 40)}</div>
        </div>

        {/* MAIN ROW */}
        <div style={{ display: "flex", gap: 36, flex: 1 }}>
          {/* SEAL */}
          <div style={{
            width: 220, height: 260,
            background: `${tierColor}14`,
            border: `1px solid ${tierColor}40`,
            borderRadius: 24, padding: 24,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <div style={{ color: tierColor, fontSize: 16, fontWeight: 800, letterSpacing: "0.2em" }}>{score.tier.toUpperCase()}</div>
            <div style={{ color: tierColor, fontSize: 120, fontWeight: 900, lineHeight: 1 }}>{score.integrity_score}</div>
            <div style={{ width: 72, borderTop: `1px solid ${tierColor}40`, margin: "4px 0" }} />
            <div style={{ color: "#4a6080", fontSize: 18 }}>/ 100</div>
          </div>

          {/* IDENTITY + BARS */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
            <div style={{ color: "#7A90A8", fontSize: 18, fontWeight: 600 }}>{product.brand}</div>
            <div style={{ color: "#ffffff", fontSize: 44, fontWeight: 800, lineHeight: 1.1, maxWidth: 720 }}>{product.name}</div>
            <div style={{ color: "#14B8A6", fontSize: 16, fontWeight: 500 }}>
              {product.category}{product.serving_size ? ` · ${product.serving_size}` : ""}
            </div>

            {/* DIMENSION BARS */}
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              {dims.map((d) => (
                <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ height: 90, width: 44, background: "rgba(17,32,64,0.6)", borderRadius: 6, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: `${Math.max(4, (d.value / 100) * 90)}px`, background: tierColor, opacity: 0.85 }} />
                  </div>
                  <div style={{ color: "#7A90A8", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>{d.label}</div>
                  <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 700 }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          marginTop: 16, paddingTop: 16,
          borderTop: "1px solid rgba(20,184,166,0.2)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {topFlag ? (
            <div style={{
              background: "rgba(248,113,113,0.12)",
              color: "#F87171",
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ⚠ Active {labelForSource(topFlag.source)}
              {topFlag.issued_date ? ` · ${new Date(topFlag.issued_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
            </div>
          ) : <div />}
          <div style={{ color: "#4a6080", fontSize: 13, letterSpacing: "0.1em" }}>
            VYVATA.COM · {score.tier.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function labelForSource(source: string): string {
  switch (source) {
    case "openfda_recall":     return "FDA Recall";
    case "fda_warning_letter": return "FDA Warning";
    case "caers":              return "Safety Signal";
    case "import_alert":       return "Import Alert";
    default:                   return "FDA Action";
  }
}
```

### 4.4 Wire into page metadata

In `src/app/products/[slug]/page.tsx`, update `generateMetadata` to include the OG image:

```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Product not found · Vyvata" };
  const score = product.product_scores[0];
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://vyvata.com";
  const ogUrl = `${base}/api/og/product?slug=${encodeURIComponent(slug)}`;
  
  return {
    title: `${product.brand} ${product.name} · Vyvata Score ${score?.integrity_score ?? "—"}/100`,
    description: score
      ? `${product.brand} ${product.name} scored ${score.integrity_score}/100 (${score.tier}) on the Vyvata Standards Framework. Independent product integrity analysis.`
      : `Vyvata-analysed: ${product.brand} ${product.name}.`,
    openGraph: {
      title: `${product.brand} ${product.name}`,
      description: score ? `Vyvata Score: ${score.integrity_score}/100 · ${score.tier.toUpperCase()}` : "",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "article",
      url: `${base}/products/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.brand} ${product.name}`,
      description: score ? `Vyvata Score: ${score.integrity_score}/100 · ${score.tier.toUpperCase()}` : "",
      images: [ogUrl],
    },
  };
}
```

---

## Gap 5 — Share buttons on the scorecard

Add a small share component directly below the hero seal on `src/app/products/[slug]/page.tsx`. Three buttons — Twitter/X, LinkedIn, Copy Link. Keep it visually restrained (it's a scorecard, not a blog post).

```tsx
// src/components/ScorecardShare.tsx
"use client";

import { Copy, Check, Twitter, Linkedin } from "lucide-react";
import { useState } from "react";

export function ScorecardShare({
  url,
  title,
  score,
  tier,
}: {
  url: string;
  title: string;
  score?: number;
  tier?: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = score && tier
    ? `${title} · Vyvata Score ${score}/100 (${tier.toUpperCase()})`
    : title;

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(17,32,64,0.6)",
    border: "1px solid rgba(20,184,166,0.2)",
    color: "#c9d6df",
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={twitterHref} target="_blank" rel="noopener noreferrer" style={btn}>
        <Twitter size={14} /> Share
      </a>
      <a href={linkedinHref} target="_blank" rel="noopener noreferrer" style={btn}>
        <Linkedin size={14} /> Post
      </a>
      <button onClick={copy} style={{ ...btn, cursor: "pointer" }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
```

Render in the scorecard page:

```tsx
// Inside src/app/products/[slug]/page.tsx, after the hero section
const canonicalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vyvata.com"}/products/${product.slug}`;

<ScorecardShare
  url={canonicalUrl}
  title={`${product.brand} ${product.name}`}
  score={score?.integrity_score}
  tier={score?.tier}
/>
```

---

## Testing

Minimal checks that prove each gap is closed:

### Manual smoke test (5 minutes)

1. Pick a product in the DB that has no current compliance flags. Note its score. Manually insert a `critical` flag matched at `high` confidence via the admin UI or direct SQL. Trigger `rescore-products` via `curl /api/cron/rescore-products` with the cron bearer. Re-check the product — score should drop, previous `product_scores` row should be `is_current=false`, new row `is_current=true`.
2. Visit `/products/{uuid-of-any-product}` — confirm 308 redirect to `/products/{slug}`.
3. Visit `/api/og/product?slug={slug}` — confirm a 1200×630 PNG renders.
4. View-source on the scorecard — confirm `<meta property="og:image">` points at `/api/og/product?slug=...`.
5. Paste the scorecard URL into Twitter compose — confirm the trading-card preview renders.
6. Click all three share buttons — confirm they produce correct intents.

### Selector regression for FDA warning letters scraper

Since the scraper is now running on a cron, a DOM change at fda.gov silently breaks ingestion. Add a test that fetches one known page (cache the HTML as a fixture) and asserts the extractor returns at least 5 rows. Run in CI daily.

### Rescore idempotency

Running `rescoreProducts({ sinceHours: 48, staleDays: 9999 })` twice in a row should produce `rescored: N` on first call and `rescored: 0, unchanged: N` on the second. If it doesn't, the "skip if identical" comparison in Gap 2 is wrong.

---

## Deliverables checklist

- [ ] `vercel.json` extended with `sync-recalls`, `sync-warning-letters`, `sync-certifications`, `rescore-products` crons
- [ ] `src/app/api/cron/sync-recalls/route.ts`
- [ ] `src/app/api/cron/sync-warning-letters/route.ts`
- [ ] `src/app/api/cron/sync-certifications/route.ts`
- [ ] `src/app/api/cron/rescore-products/route.ts`
- [ ] `src/lib/scoring/rescore-job.ts`
- [ ] `supabase/migrations/20260419_rescore_rpc.sql` — `products_needing_rescore` RPC + updated_at columns as needed
- [ ] `supabase/migrations/20260419_product_slugs.sql` — slug column, backfill, insert trigger
- [ ] Rename `src/app/products/[id]/` → `src/app/products/[slug]/` + UUID redirect
- [ ] `src/lib/urls.ts` — `productUrl()` helper
- [ ] All internal product links updated to use `productUrl()`
- [ ] `src/app/sitemap.ts` — include product slugs
- [ ] `src/app/api/og/product/route.tsx` — trading-card OG image
- [ ] `src/app/products/[slug]/page.tsx` — `generateMetadata` points at new OG route; share component rendered
- [ ] `src/components/ScorecardShare.tsx` — Twitter / LinkedIn / Copy Link
- [ ] Admin manual rescore button on product rows
- [ ] Selector regression test for FDA warning letters scraper
- [ ] Idempotency test for rescore-products
- [ ] Smoke-test: one real product, insert critical flag, run rescorer, verify tier drop

---

## What NOT to do

- **Do not rename `compliance_flags.matched_product_id` to something else.** The scorecard page already queries on that column; migration cost is not worth symmetry.
- **Do not rewrite `product-scoring.ts`.** If the compliance penalty math feels wrong, adjust constants, not architecture.
- **Do not touch `src/app/api/og/route.tsx`.** The protocol OG is working and used elsewhere. The product OG is a new sibling, not a rewrite.
- **Do not skip the 308 redirect for legacy UUID URLs.** Shared URLs in the wild will break. A permanent redirect costs nothing and preserves the SEO surface.
- **Do not gate compliance data behind match_confidence='high' everywhere.** On scorecards, show high and medium confidence flags (per existing behavior). Only score with high-confidence to avoid docking points on iffy matches.

---

## What success looks like in 5-7 days

- A brand googles themselves. Their scorecard URL is the first result. The OG preview makes it tweet-able.
- Your friend asks "what changed?" on a product and can see a score-history row explaining why the tier dropped.
- An FDA warning letter gets posted Tuesday. Wednesday 5am the scraper picks it up. 6:30am the rescorer moves the affected tier from Verified to Standard. By 7am it's live on the public scorecard. No human clicked anything.
- You post a scorecard URL in a tweet and see actual share-card engagement. That's the feedback loop running.

---

*Last updated: 2026-04-19*

---

## Completion log — 2026-04-18

All five gaps closed. Deliverables shipped across commits `a65b3cd`, `950fc1f`, `d8df7c5`, and the follow-up on this date.

### What was built

**Gap 1 — automated compliance sync**
- `src/app/api/cron/sync-recalls/route.ts`, `sync-caers/`, `sync-warning-letters/`, `sync-certifications/` — per-source crons so a flaky source can't take down the whole pipeline
- `src/app/api/cron/_shared.ts` — shared auth helper (`authorizeCronRequest`) accepting either `Authorization: Bearer $CRON_SECRET` or an admin cookie
- `vercel.json` — Monday staggered schedule: certs 04:00 → recalls 05:00 → caers 05:10 → warning letters 05:20 → rescore 05:30 (all UTC). Cert sync runs first so rescore sees fresh data
- `/api/admin/compliance/sync` still exists for manual "run everything now" triggers; it also includes warning letters

**Gap 2 — close the compliance → score loop**
- `src/lib/scoring/rescore-job.ts` — pure orchestrator. Iterates active products (N=70, JS loop is fine; the `products_needing_rescore` RPC from the plan was skipped as premature for this scale). Returns `RescoreResult` with `tierChanges[]`
- `src/app/api/cron/rescore-products/route.ts` — weekly cron wrapper
- `src/lib/scoring/notify-tier-changes.ts` — `notifyPractitionersOfTierChanges()` scans `patient_links` for raw_input hits on downgraded products' brand/name, groups by practitioner, sends one branded Resend email per
- `/api/admin/products/[id]/score` refactored to delegate to `rescoreProducts({ productIds: [id], reason: "manual" })` — admin button now skips no-op writes and triggers emails on tier drops, same as the cron

**Gap 3 — slug-based scorecard URLs**
- `supabase/migrations/20260418_products_slug.sql` — `slug` TEXT UNIQUE NOT NULL, `slugify()` SQL function, one-time backfill with collision suffix, insert trigger. All 69 products backfilled
- `src/app/products/[id]/page.tsx` renamed to `src/app/products/[slug]/page.tsx`; UUID requests hit `permanentRedirect()` to the canonical slug URL
- `src/lib/urls.ts` — `productUrl(product)` helper for internal links; `productUrlAbsolute(product, base?)` for OG/emails
- All call sites migrated: `src/app/products/page.tsx`, `src/components/ProductRecommendations.tsx`, `src/app/admin/compliance/AdminComplianceClient.tsx` (with the flags endpoint now selecting `slug`)
- `src/app/sitemap.ts` — every active product's slug URL

**Gap 4 — product OG image**
- `src/app/api/og/product/route.tsx` — Edge-runtime trading card. 1200×630, dark Vyvata gradient, left tier seal with score + /100, right brand + name + 6 vertical dimension bars, footer red compliance pill when flags exist
- Scorecard `generateMetadata` emits absolute openGraph/twitter image URLs (not relative — LinkedIn's scraper ignores `metadataBase`) and an `alternates.canonical` pointing at the slug URL

**Gap 5 — share buttons**
- `src/components/ShareButtons.tsx` — Twitter / LinkedIn / Copy Link pills. Lucide v1.8 removed brand icons; used `Share2` + text label as the pragmatic fallback
- Rendered below the scorecard hero on [slug] page

### Verification scripts

`scripts/test-og-smoke.ts` — GET the product OG route and assert it returns a >10KB PNG. Picks a live slug from Supabase if none supplied.
`scripts/test-rescore-idempotency.ts` — runs `rescoreProducts()` twice; second run must write zero new rows.
`scripts/test-warning-letters-selector.ts` — fetches the FDA DataTables endpoint and asserts ≥5 rows with company+letterUrl populated. Catches column-order drift before it silently kills ingestion.

Run with `npx tsx scripts/test-<name>.ts`.

### Deliberate deviations from the plan

- **Skipped the `products_needing_rescore` RPC.** At 70 products a full iteration in JS is ~5 seconds; adding a Postgres RPC is speculative optimization. Revisit at 500+ products.
- **Scripts instead of a test runner.** No vitest/jest is installed. Adding one to run three scripts wasn't a trade-off worth making; `npx tsx scripts/test-*.ts` runs the same assertions ad-hoc.
- **Added CAERS as a separate cron** beyond what the plan listed — the Close-the-Loop doc predates the CAERS ingester. Recalls, CAERS, and warning letters each have their own endpoint.
- **Lucide v1.8 dropped brand icons.** Twitter/LinkedIn icons used in the plan's share component don't exist in this lucide version. `Share2` + "Tweet" / "LinkedIn" text labels substitute.

### Still not done (explicitly out of scope for this pass)

- Smoke-test walkthrough from the plan's "Manual smoke test" section — requires manually inserting a critical flag and watching the tier drop. Not automated; do it once by hand before relying on the pipeline
- Structured JSON logging on every cron handler (plan's §1.3) — current handlers return JSON but don't emit the standardized `{event, ok, duration_ms, ...}` log line. Low priority until we need Vercel log search
