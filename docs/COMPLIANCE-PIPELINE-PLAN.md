# Compliance Data Pipeline — Implementation Plan

> **Purpose:** Populate VSF's Safety (15%) and Transparency (12%) dimensions with authoritative FDA data. When complete, ~27% of the VSF scoring surface auto-populates from federal APIs without vendor submission, expert review, or manual curation.
>
> **Context:** This is the first concrete edge described in `STRATEGIC-REVIEW-2026-04.md`. Read that document first.

---

## Sources

| # | Source | Access method | Feeds VSF dimension |
|---|---|---|---|
| 1 | openFDA `/food/enforcement.json` | Official REST API | Safety (recalls), Transparency |
| 2 | openFDA `/food/event.json` | Official REST API | Safety (adverse-event aggregates) |
| 3 | FDA Warning Letters index | HTML scrape (no API) | Transparency, Safety |

**Why these are safe to ingest:**

- Federal works are public domain under 17 USC §105 — no copyright exposure.
- Official APIs are documented and explicitly authorized — no CFAA risk.
- HTML scrape of `fda.gov` Warning Letters index is a public page served anonymously with a standard User-Agent; we honor `robots.txt` and rate-limit aggressively.
- The data is authoritative — US government regulatory actions, not opinions.

---

## Before you start

Read these in order:

1. `CLAUDE.md` / `AGENTS.md` — this is **Next.js 16**, not what your training data might show. Read `node_modules/next/dist/docs/` for App Router, route handlers, and `unstable_cache` patterns before writing any Next code.
2. `STRATEGIC-REVIEW-2026-04.md` — why this is the first priority.
3. `VSF-ROADMAP.md` — how this slots into the scoring framework.
4. `src/lib/ingredients-db.ts` — data shape conventions (interface + const + named exports).
5. `src/lib/rules-engine.ts` — module structure conventions (types at top, pure functions, no side effects in module scope).
6. `supabase/migrations/20260418_vsf_phase1_products_and_scoring.sql` — existing schema for `products`, `manufacturers`, `product_ingredients`. This plan extends those tables; do not recreate them.

---

## Dependencies

Already installed (verified in `package.json`):

- `cheerio` ^1.2.0 — HTML parsing for Warning Letters
- `@supabase/ssr` ^0.10.2, `@supabase/supabase-js` ^2.103.3
- `zod` ^4.3.6
- `@anthropic-ai/sdk` ^0.90.0 (used only for ambiguous match resolution, never for compliance decisions)

Add:

```bash
npm install p-retry limiter
```

`p-retry` handles exponential backoff on 429/503. `limiter` provides the per-host rate-limit bucket.

---

## Environment variables

Append to `.env.local` and document in `.env.production.example`:

```bash
# openFDA API (optional — works without key at lower daily quota)
# Free key from https://open.fda.gov/apis/authentication/
OPENFDA_API_KEY=

# Bot identity for all outbound government requests
BOT_USER_AGENT=VyvataBot/1.0 (+https://vyvata.com/bot; ingest@vyvata.com)
BOT_CONTACT_EMAIL=ingest@vyvata.com

# Cron auth (shared with any other cron endpoints)
CRON_SECRET=

# Toggle to run pipelines in dry-run mode (fetches and logs but does not write)
INGESTION_DRY_RUN=false
```

Update whichever module handles env validation (search for `zod.*env` in `src/lib/`) to include these. `OPENFDA_API_KEY` should be optional (zod `.optional()`); the rest required when ingestion runs.

---

## Task 1 — Bot identity page

**File:** `src/app/bot/page.tsx`

**Why this matters:** When a sysadmin at NCBI or FDA sees `VyvataBot` in their logs and wonders who's hitting their endpoint at 3am, they need a URL they can visit to contact us. This is the single most important legal-and-ethical hygiene step in the whole pipeline — it reclassifies us from "anonymous scraper" to "identified researcher."

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VyvataBot — Automated Data Ingestion",
  robots: { index: true, follow: false },
};

export default function BotPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold mb-6">VyvataBot</h1>
      <p className="mb-4 text-lg leading-relaxed">
        Vyvata operates an automated data ingestion system that pulls
        public-domain supplement regulatory data from the FDA (via openFDA
        and the FDA Warning Letters index), the NIH Office of Dietary
        Supplements, and PubMed. We honor <code>robots.txt</code>, respect
        published rate limits, and cache responses aggressively to
        minimize repeated load on upstream servers.
      </p>
      <p className="mb-4 text-lg leading-relaxed">Our requests carry this User-Agent:</p>
      <pre className="bg-neutral-100 p-4 rounded text-sm mb-4 font-mono overflow-x-auto">
        VyvataBot/1.0 (+https://vyvata.com/bot; ingest@vyvata.com)
      </pre>
      <p className="text-lg leading-relaxed">
        If our traffic is causing issues for your service, email{" "}
        <a href="mailto:ingest@vyvata.com" className="underline">
          ingest@vyvata.com
        </a>{" "}
        and we will throttle or halt immediately.
      </p>
    </main>
  );
}
```

Match the existing landing page's type scale and spacing. The copy is more important than the visual polish — this page exists for compliance, not conversion.

---

## Task 2 — Database migration

**File:** `supabase/migrations/20260419_compliance_flags_and_ingestion.sql`

Follow the exact style of `20260418_vsf_phase1_products_and_scoring.sql`:

- ══ separator banners
- UPPERCASE SQL keywords
- `gen_random_uuid()` (not `uuid_generate_v4()`)
- `TIMESTAMPTZ NOT NULL DEFAULT NOW()` for timestamps
- `DROP TABLE IF EXISTS … CASCADE` at top for clean dev rebuilds
- Descriptive comment header with purpose and related agents

```sql
-- Migration: Compliance Flags and Data Ingestion Infrastructure
-- Created: 2026-04-19
-- Purpose: Populate VSF Safety (15%) and Transparency (12%) dimensions with
--          authoritative FDA data (recalls, warning letters, adverse events).
-- Related Docs: STRATEGIC-REVIEW-2026-04.md, docs/COMPLIANCE-PIPELINE-PLAN.md

-- ══════════════════════════════════════════════════════════════
-- 0. Drop existing (clean slate for development)
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.ingestion_review_queue CASCADE;
DROP TABLE IF EXISTS public.compliance_flag_matches CASCADE;
DROP TABLE IF EXISTS public.compliance_flags CASCADE;
DROP TABLE IF EXISTS public.ingestion_raw CASCADE;

-- ══════════════════════════════════════════════════════════════
-- 1. Raw ingestion cache (idempotency + change detection)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.ingestion_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source TEXT NOT NULL,              -- 'openfda_recall', 'openfda_caers', 'fda_warning'
  source_id TEXT NOT NULL,           -- natural key from source (recall_number, posted_date+firm, etc.)
  url TEXT,
  http_status INTEGER,
  
  content_hash TEXT NOT NULL,        -- sha256 of payload, drives dedup
  payload JSONB NOT NULL,            -- raw response
  parsed JSONB,                      -- normalized shape
  confidence NUMERIC,                -- 0..1 from normalizer
  
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'normalized', 'published', 'review', 'rejected', 'unchanged')),
  error_message TEXT,
  
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (source, source_id)
);

CREATE INDEX idx_ingestion_raw_status ON public.ingestion_raw (status);
CREATE INDEX idx_ingestion_raw_source_fetched ON public.ingestion_raw (source, fetched_at DESC);

-- ══════════════════════════════════════════════════════════════
-- 2. Compliance flags (the durable record surfaced on scorecards)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  flag_type TEXT NOT NULL
    CHECK (flag_type IN ('recall', 'warning_letter', 'import_alert', 'safety_signal')),
  severity TEXT NOT NULL
    CHECK (severity IN ('critical', 'major', 'minor', 'informational')),
  
  -- Who the action was taken against
  firm_name TEXT NOT NULL,
  product_description TEXT,
  
  -- What and why
  reason TEXT NOT NULL,
  regulations_cited TEXT[] DEFAULT '{}',
  
  -- When
  event_date DATE,                   -- when the action/recall/letter was issued
  reported_at DATE,                  -- when FDA posted it publicly
  
  -- Source attribution (every flag MUST link back to source)
  source TEXT NOT NULL,              -- 'openfda_recall', 'fda_warning', etc.
  source_id TEXT NOT NULL,           -- matches ingestion_raw.source_id
  source_url TEXT NOT NULL,
  
  -- Lifecycle
  resolved BOOLEAN DEFAULT false,
  resolved_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (source, source_id)
);

CREATE INDEX idx_compliance_flags_firm ON public.compliance_flags (firm_name);
CREATE INDEX idx_compliance_flags_severity ON public.compliance_flags (severity, resolved);
CREATE INDEX idx_compliance_flags_date ON public.compliance_flags (event_date DESC);

-- ══════════════════════════════════════════════════════════════
-- 3. Flag ↔ manufacturer / product matches (many-to-many)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.compliance_flag_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.compliance_flags(id) ON DELETE CASCADE,
  
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  match_confidence NUMERIC NOT NULL CHECK (match_confidence BETWEEN 0 AND 1),
  match_method TEXT NOT NULL
    CHECK (match_method IN ('exact', 'fuzzy', 'manual', 'llm')),
  
  -- Human can override an automated match
  human_verified BOOLEAN DEFAULT false,
  verified_by TEXT,                  -- email of the reviewer
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- A match must link to at least one entity
  CHECK (manufacturer_id IS NOT NULL OR product_id IS NOT NULL)
);

CREATE INDEX idx_flag_matches_manufacturer ON public.compliance_flag_matches (manufacturer_id);
CREATE INDEX idx_flag_matches_product ON public.compliance_flag_matches (product_id);
CREATE INDEX idx_flag_matches_flag ON public.compliance_flag_matches (flag_id);

-- ══════════════════════════════════════════════════════════════
-- 4. Review queue (low-confidence matches + new-flag approvals)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.ingestion_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  ingestion_raw_id UUID REFERENCES public.ingestion_raw(id) ON DELETE CASCADE,
  flag_id UUID REFERENCES public.compliance_flags(id) ON DELETE CASCADE,
  
  kind TEXT NOT NULL
    CHECK (kind IN ('new_flag', 'match', 'resolution', 'severity_change')),
  reason TEXT,                       -- why this hit the queue
  
  proposed JSONB NOT NULL,           -- what would be written on approval
  existing JSONB,                    -- current record if this is an update
  
  reviewer_email TEXT,
  decided_at TIMESTAMPTZ,
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'modified')),
  modifications JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_pending ON public.ingestion_review_queue (created_at)
  WHERE decided_at IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 5. Extend products and manufacturers with compliance aggregates
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS active_flag_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_flag_check TIMESTAMPTZ;

ALTER TABLE public.manufacturers
  ADD COLUMN IF NOT EXISTS compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS active_flag_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_flag_check TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════
-- 6. Function: recalculate compliance_score for a product/manufacturer
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.recalculate_compliance_score(p_manufacturer_id UUID, p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_base_score INTEGER := 100;
  v_critical_count INTEGER := 0;
  v_major_count INTEGER := 0;
  v_minor_count INTEGER := 0;
  v_final_score INTEGER;
BEGIN
  -- Count unresolved flags linked to this product OR manufacturer
  SELECT
    COUNT(*) FILTER (WHERE cf.severity = 'critical') ,
    COUNT(*) FILTER (WHERE cf.severity = 'major'),
    COUNT(*) FILTER (WHERE cf.severity = 'minor')
  INTO v_critical_count, v_major_count, v_minor_count
  FROM public.compliance_flags cf
  JOIN public.compliance_flag_matches cfm ON cfm.flag_id = cf.id
  WHERE cf.resolved = false
    AND (
      (p_product_id IS NOT NULL AND cfm.product_id = p_product_id)
      OR (p_manufacturer_id IS NOT NULL AND cfm.manufacturer_id = p_manufacturer_id)
    );
  
  -- Deduct: critical = -35, major = -15, minor = -5, cap at 0
  v_final_score := GREATEST(0,
    v_base_score
      - (v_critical_count * 35)
      - (v_major_count * 15)
      - (v_minor_count * 5)
  );
  
  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- 7. Trigger: refresh counts + scores when matches change
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_refresh_compliance_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_manufacturer_id UUID;
BEGIN
  -- Handle INSERT / UPDATE / DELETE uniformly
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    v_manufacturer_id := OLD.manufacturer_id;
  ELSE
    v_product_id := NEW.product_id;
    v_manufacturer_id := NEW.manufacturer_id;
  END IF;
  
  -- Update product aggregate
  IF v_product_id IS NOT NULL THEN
    UPDATE public.products SET
      active_flag_count = (
        SELECT COUNT(*) FROM public.compliance_flag_matches cfm
        JOIN public.compliance_flags cf ON cf.id = cfm.flag_id
        WHERE cfm.product_id = v_product_id AND cf.resolved = false
      ),
      compliance_score = public.recalculate_compliance_score(NULL, v_product_id),
      last_flag_check = NOW(),
      updated_at = NOW()
    WHERE id = v_product_id;
  END IF;
  
  -- Update manufacturer aggregate
  IF v_manufacturer_id IS NOT NULL THEN
    UPDATE public.manufacturers SET
      active_flag_count = (
        SELECT COUNT(*) FROM public.compliance_flag_matches cfm
        JOIN public.compliance_flags cf ON cf.id = cfm.flag_id
        WHERE cfm.manufacturer_id = v_manufacturer_id AND cf.resolved = false
      ),
      compliance_score = public.recalculate_compliance_score(v_manufacturer_id, NULL),
      last_flag_check = NOW(),
      updated_at = NOW()
    WHERE id = v_manufacturer_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_compliance_on_match_change
AFTER INSERT OR UPDATE OR DELETE ON public.compliance_flag_matches
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_compliance_aggregates();

-- ══════════════════════════════════════════════════════════════
-- 8. RLS — public read on flags, service role for ingestion
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.compliance_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_flag_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_review_queue ENABLE ROW LEVEL SECURITY;

-- Public reads flags (drives scorecards); only verified or auto-published flags are visible
CREATE POLICY public_read_flags ON public.compliance_flags
  FOR SELECT USING (true);

CREATE POLICY public_read_matches ON public.compliance_flag_matches
  FOR SELECT USING (
    match_confidence >= 0.85 OR human_verified = true
  );

-- Ingestion tables are service-role-only
CREATE POLICY service_raw ON public.ingestion_raw
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_queue ON public.ingestion_review_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Key safety design:** Low-confidence matches are written to `compliance_flag_matches` but are **invisible to public reads** until human-verified. This prevents false-positive compliance claims from surfacing on scorecards — a critical defamation-risk guardrail.

---

## Task 3 — Shared ingestion client

**File:** `src/lib/ingestion/client.ts`

Create the subdirectory `src/lib/ingestion/`. All compliance-pipeline modules live here, flat, one file per responsibility.

```typescript
// Shared HTTP client for government data sources.
// Enforces per-host rate limits, exponential backoff on 429/503,
// and the bot identity User-Agent on every request.

import pRetry from "p-retry";
import { RateLimiter } from "limiter";

type Host =
  | "api.fda.gov"
  | "www.fda.gov"
  | "api.ods.od.nih.gov"
  | "eutils.ncbi.nlm.nih.gov"
  | "ods.od.nih.gov";

const RATE_LIMITS: Record<Host, { rps: number }> = {
  "api.fda.gov":            { rps: 4 },      // 240/min documented
  "www.fda.gov":            { rps: 0.5 },    // 1 req / 2 sec for HTML
  "api.ods.od.nih.gov":     { rps: 2 },
  "eutils.ncbi.nlm.nih.gov":{ rps: 8 },      // 10/sec with key, leave headroom
  "ods.od.nih.gov":         { rps: 0.5 },
};

const limiters = new Map<Host, RateLimiter>();
function getLimiter(host: Host): RateLimiter {
  let lim = limiters.get(host);
  if (!lim) {
    const { rps } = RATE_LIMITS[host];
    lim = new RateLimiter({
      tokensPerInterval: Math.max(1, Math.floor(rps * 60)),
      interval: "minute",
    });
    limiters.set(host, lim);
  }
  return lim;
}

export interface GovFetchOptions {
  host: Host;
  accept?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export async function govFetch(url: string, opts: GovFetchOptions): Promise<Response> {
  const limiter = getLimiter(opts.host);
  await limiter.removeTokens(1);

  return pRetry(
    async () => {
      const userAgent = process.env.BOT_USER_AGENT;
      if (!userAgent) {
        throw new Error("BOT_USER_AGENT not set — refusing to make anonymous request");
      }

      const res = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: opts.accept ?? "application/json",
        },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });

      if (res.status === 429 || res.status === 503) {
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          const waitMs = Number(retryAfter) * 1000;
          if (Number.isFinite(waitMs) && waitMs > 0 && waitMs < 60_000) {
            await new Promise((r) => setTimeout(r, waitMs));
          }
        }
        throw new Error(`Rate limited (${res.status})`);
      }
      if (!res.ok && res.status >= 500) {
        throw new Error(`Upstream ${res.status}`);
      }
      return res;
    },
    {
      retries: opts.maxRetries ?? 4,
      minTimeout: 1000,
      factor: 2,
      randomize: true,
      onFailedAttempt(err) {
        console.warn(
          `[govFetch] ${url} — attempt ${err.attemptNumber} failed: ${err.message} (${err.retriesLeft} left)`,
        );
      },
    },
  );
}

/** SHA-256 hash a JSON payload for change detection. */
export async function hashPayload(payload: unknown): Promise<string> {
  const buf = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

---

## Task 4 — Raw upsert helper

**File:** `src/lib/ingestion/persist.ts`

Creates a dedicated Supabase admin client following the existing `@supabase/ssr` patterns. If the project already has a service-role client helper (search `src/lib/supabase/` or similar), use that instead.

```typescript
import { createClient } from "@supabase/supabase-js";
import { hashPayload } from "./client";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin credentials missing");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface RawUpsertInput {
  source: string;
  source_id: string;
  url?: string;
  http_status: number;
  payload: unknown;
}

export type UpsertResult = "new" | "changed" | "unchanged";

/**
 * Upsert a raw record. Idempotent across re-runs via content_hash check.
 * Returns 'unchanged' when the upstream content hasn't moved — callers
 * should skip re-normalization in that case.
 */
export async function upsertRaw(input: RawUpsertInput): Promise<UpsertResult> {
  const content_hash = await hashPayload(input.payload);
  const sb = adminClient();

  const { data: existing } = await sb
    .from("ingestion_raw")
    .select("id, content_hash")
    .eq("source", input.source)
    .eq("source_id", input.source_id)
    .maybeSingle();

  if (existing && existing.content_hash === content_hash) {
    await sb
      .from("ingestion_raw")
      .update({ fetched_at: new Date().toISOString(), status: "unchanged" })
      .eq("id", existing.id);
    return "unchanged";
  }

  await sb.from("ingestion_raw").upsert(
    {
      source: input.source,
      source_id: input.source_id,
      url: input.url ?? null,
      http_status: input.http_status,
      content_hash,
      payload: input.payload as object,
      status: "pending",
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "source,source_id" },
  );

  return existing ? "changed" : "new";
}
```

---

## Task 5 — openFDA recalls pipeline

**File:** `src/lib/ingestion/openfda-recalls.ts`

```typescript
import { govFetch } from "./client";
import { upsertRaw } from "./persist";

const BASE = "https://api.fda.gov/food/enforcement.json";

export interface RecallHit {
  recall_number: string;
  reason_for_recall: string;
  status: string;                  // 'Ongoing' | 'Completed' | 'Terminated'
  recalling_firm: string;
  product_description: string;
  product_type: string;            // 'Food'
  classification: string;          // 'Class I' | 'Class II' | 'Class III'
  code_info?: string;
  initial_firm_notification?: string;
  recall_initiation_date?: string; // yyyymmdd
  report_date?: string;
  distribution_pattern?: string;
}

interface RecallResponse {
  meta: { results: { total: number; skip: number; limit: number } };
  results: RecallHit[];
}

export interface IngestResult {
  fetched: number;
  new: number;
  changed: number;
  unchanged: number;
}

/**
 * Fetch supplement recalls since a given ISO date, incrementally.
 * openFDA has a 25,000 hard cap on the skip parameter — for larger
 * ranges, split the query by date window.
 */
export async function ingestOpenFdaRecalls(sinceIsoDate: string): Promise<IngestResult> {
  const since = sinceIsoDate.replace(/-/g, "");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // Lucene-ish search: food products with "supplement" in description, within date range
  const search = encodeURIComponent(
    `product_type:"Food" AND product_description:supplement AND report_date:[${since}+TO+${today}]`,
  );

  const totals: IngestResult = { fetched: 0, new: 0, changed: 0, unchanged: 0 };
  let skip = 0;
  const limit = 100;

  while (skip < 25_000) {
    const key = process.env.OPENFDA_API_KEY;
    const url = `${BASE}?search=${search}&limit=${limit}&skip=${skip}${key ? `&api_key=${key}` : ""}`;

    const res = await govFetch(url, { host: "api.fda.gov" });
    if (res.status === 404) break; // openFDA returns 404 for empty results

    const body = (await res.json()) as RecallResponse;
    const hits = body.results ?? [];
    totals.fetched += hits.length;

    for (const hit of hits) {
      const result = await upsertRaw({
        source: "openfda_recall",
        source_id: hit.recall_number,
        url,
        http_status: res.status,
        payload: hit,
      });
      totals[result]++;
    }

    if (hits.length < limit) break;
    skip += limit;
  }

  return totals;
}
```

---

## Task 6 — openFDA CAERS pipeline

**File:** `src/lib/ingestion/openfda-caers.ts`

**Important safety note:** CAERS is voluntary reporting with no causation established. Individual reports must NEVER be shown to end users or used to flag specific products. We only use aggregate signals at the ingredient level.

```typescript
import { govFetch } from "./client";
import { upsertRaw } from "./persist";

const BASE = "https://api.fda.gov/food/event.json";

interface CaersHit {
  report_number: string;
  date_created: string;
  products: Array<{
    name_brand?: string;
    industry_name: string;
    role: string;
  }>;
  reactions: string[];
  outcomes?: string[];
}

/**
 * Ingest CAERS reports for supplement-category products.
 * Aggregation into ingredient-level safety signals happens in a separate
 * normalization pass — this function only caches raw reports.
 *
 * Raw reports should be PURGED after 90 days. Only the aggregated,
 * human-reviewed safety_signal flags should persist.
 */
export async function ingestOpenFdaCaers(sinceIsoDate: string): Promise<IngestResult> {
  const since = sinceIsoDate.replace(/-/g, "");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // CAERS industry_name for supplements is "Vit/Min/Prot/Unconv Diet(Human/Animal)"
  const search = encodeURIComponent(
    `products.industry_name:"Vit/Min/Prot/Unconv+Diet(Human/Animal)" AND date_created:[${since}+TO+${today}]`,
  );

  const totals: IngestResult = { fetched: 0, new: 0, changed: 0, unchanged: 0 };
  let skip = 0;
  const limit = 100;

  while (skip < 25_000) {
    const key = process.env.OPENFDA_API_KEY;
    const url = `${BASE}?search=${search}&limit=${limit}&skip=${skip}${key ? `&api_key=${key}` : ""}`;

    const res = await govFetch(url, { host: "api.fda.gov" });
    if (res.status === 404) break;

    const body = (await res.json()) as { results?: CaersHit[] };
    const hits = body.results ?? [];
    totals.fetched += hits.length;

    for (const hit of hits) {
      const result = await upsertRaw({
        source: "openfda_caers",
        source_id: hit.report_number,
        url,
        http_status: res.status,
        payload: hit,
      });
      totals[result]++;
    }

    if (hits.length < limit) break;
    skip += limit;
  }

  return totals;
}

export interface IngestResult {
  fetched: number;
  new: number;
  changed: number;
  unchanged: number;
}
```

---

## Task 7 — FDA Warning Letters scraper

**File:** `src/lib/ingestion/fda-warnings.ts`

**This is the one non-API federal source.** The Warning Letters index is a paginated HTML table at `fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters`. openFDA does not expose it.

```typescript
import * as cheerio from "cheerio";
import { govFetch } from "./client";
import { upsertRaw } from "./persist";

const INDEX_URL =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters";

export interface WarningLetter {
  posted_date: string;
  letter_date: string;
  company_name: string;
  issuing_office: string;
  subject: string;
  detail_url: string;
}

const SUPPLEMENT_RELEVANT_TERMS = [
  "dietary supplement",
  "cgmp",
  "good manufacturing practice",
  "misbranded",
  "adulterated",
  "new dietary ingredient",
  "unapproved drug",
  "disease claim",
  "21 cfr 111",
];

function isSupplementRelevant(subject: string): boolean {
  const lower = subject.toLowerCase();
  return SUPPLEMENT_RELEVANT_TERMS.some((t) => lower.includes(t));
}

/**
 * Scrape pages of the Warning Letters index, filter to supplement-relevant
 * subjects, upsert into ingestion_raw. Pages is inclusive.
 */
export async function ingestFdaWarningLetters(pagesToScan = 5): Promise<IngestResult> {
  const totals: IngestResult = { fetched: 0, new: 0, changed: 0, unchanged: 0 };

  for (let page = 0; page < pagesToScan; page++) {
    const url = `${INDEX_URL}?search_api_fulltext=dietary+supplement&page=${page}`;
    const res = await govFetch(url, { host: "www.fda.gov", accept: "text/html" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const rows = $("table tbody tr").toArray();
    if (rows.length === 0) {
      console.warn("[fda-warnings] no rows found — selector may be stale, review DOM");
      break;
    }

    for (const row of rows) {
      const cells = $(row).find("td");
      if (cells.length < 5) continue;

      const letter: WarningLetter = {
        posted_date: $(cells[0]).text().trim(),
        letter_date: $(cells[1]).text().trim(),
        company_name: $(cells[2]).text().trim(),
        issuing_office: $(cells[3]).text().trim(),
        subject: $(cells[4]).text().trim(),
        detail_url: new URL(
          $(cells[2]).find("a").attr("href") ?? "",
          "https://www.fda.gov",
        ).toString(),
      };

      if (!isSupplementRelevant(letter.subject)) continue;

      totals.fetched++;
      const result = await upsertRaw({
        source: "fda_warning",
        source_id: `${letter.posted_date}__${letter.company_name}`.slice(0, 200),
        url: letter.detail_url,
        http_status: 200,
        payload: letter,
      });
      totals[result]++;
    }
  }

  return totals;
}

interface IngestResult {
  fetched: number;
  new: number;
  changed: number;
  unchanged: number;
}
```

**Selector stability:** The FDA table has changed layout twice in the last three years. Add a CI test (see Task 12) that fetches one known page and asserts at least 5 rows extract cleanly. If that test fails, alert — it means the DOM changed and the selector needs a pass.

---

## Task 8 — Firm/product matching

**File:** `src/lib/ingestion/match.ts`

Every flag names a `firm_name`. We need to map that to the `manufacturers` table (and downstream to specific `products` when possible). This is the hardest piece of the pipeline — firm names in FDA data are inconsistent ("Thorne Research Inc.", "Thorne Research, Inc.", "THORNE HEALTHTECH INC", etc.).

**Matching strategy (5 tiers, highest confidence first):**

1. **Exact match** on normalized name → confidence 1.0
2. **Alias match** against `manufacturers.name` with lowercased, punctuation-stripped comparison → 0.95
3. **Fuzzy match** via Postgres `pg_trgm` similarity > 0.7 → 0.7 + (similarity * 0.25)
4. **LLM-assisted match** (only if no fuzzy hit) — ask Claude with a short prompt "is X the same firm as Y?" over the top 5 fuzzy candidates → confidence from LLM 0..1, capped at 0.85
5. **No match** → enqueue to review queue, confidence 0

Skeleton:

```typescript
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'"]/g, "")
    .replace(/\b(inc|llc|ltd|corp|co|company|group)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchResult {
  manufacturer_id: string | null;
  product_id: string | null;
  confidence: number;
  method: "exact" | "fuzzy" | "manual" | "llm";
}

export async function matchFirmToManufacturer(firmName: string): Promise<MatchResult> {
  const normalized = normalize(firmName);
  // Tier 1: exact normalized match
  // Tier 2: alias match
  // Tier 3: pg_trgm similarity (requires extension; see migration)
  // Tier 4: LLM disambiguation if no confident hit
  // Tier 5: return null → review queue
  // ... full implementation
}
```

**Enable pg_trgm** in a one-line migration bump (if not already):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_manufacturers_name_trgm
  ON public.manufacturers USING gin (name gin_trgm_ops);
```

**LLM call structure** (use only when fuzzy < 0.7):

- Model: `claude-haiku-4-5-20251001` (cheap, deterministic enough for name matching)
- System prompt: "You determine whether two company names refer to the same legal entity. Respond with JSON: `{\"same\": boolean, \"confidence\": 0-1, \"reason\": string}`. Be conservative — only `same: true` if highly confident."
- Cache results in `ingestion_raw` with `source: 'llm_match'` to avoid re-running.

---

## Task 9 — Raw → flag normalizer

**File:** `src/lib/ingestion/normalize.ts`

Takes a pending `ingestion_raw` row, produces a `compliance_flag` + `compliance_flag_matches`. Handles all three sources.

**Critical rule — never auto-publish matches below 0.85 confidence.** A false "Thorne has an FDA warning letter" claim is a defamation risk. Low-confidence matches go to the review queue.

Pseudo-structure:

```typescript
export async function normalizeBatch(batchSize = 50): Promise<void> {
  // 1. Select pending ingestion_raw rows
  // 2. For each:
  //    a. Route to the right normalizer by source
  //    b. Normalizer returns { flag: ComplianceFlag, firm: string, productDesc: string }
  //    c. Call matchFirmToManufacturer(firm)
  //    d. If match.confidence >= 0.85: upsert flag + match rows directly
  //    e. If 0.5 <= confidence < 0.85: upsert flag (unmatched) + enqueue match for review
  //    f. If confidence < 0.5: mark ingestion_raw status='review' + enqueue with reason 'low_confidence'
  //    g. Mark ingestion_raw.status accordingly
}

function normalizeRecall(hit: RecallHit): { flag: NewFlag } {
  const severityMap: Record<string, "critical" | "major" | "minor"> = {
    "Class I":   "critical",  // reasonable probability of serious adverse health consequences
    "Class II":  "major",     // temporary or medically reversible health consequences
    "Class III": "minor",     // unlikely to cause adverse health consequences
  };
  // ... build flag
}

function normalizeWarningLetter(letter: WarningLetter): { flag: NewFlag } {
  // Severity from subject:
  //   contains 'adulterated' | 'unapproved drug' → major
  //   contains 'cgmp' | 'misbranded' → major
  //   contains 'disease claim' → minor
  //   otherwise → informational
}
```

---

## Task 10 — Cron endpoints

**Directory:** `src/app/api/cron/`

Next.js 16 App Router route handlers. Each endpoint authenticates with `CRON_SECRET` in the Authorization header. Vercel Cron adds this automatically when `vercel.json` has the matching `schedule` entry.

**Files to create:**

- `src/app/api/cron/ingest-openfda-recalls/route.ts`
- `src/app/api/cron/ingest-openfda-caers/route.ts`
- `src/app/api/cron/ingest-fda-warnings/route.ts`
- `src/app/api/cron/run-normalizer/route.ts`

Template (one per source):

```typescript
import { NextResponse } from "next/server";
import { ingestOpenFdaRecalls } from "@/lib/ingestion/openfda-recalls";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — Vercel Pro

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Resume from most recent successful ingestion
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: last } = await sb
    .from("ingestion_raw")
    .select("fetched_at")
    .eq("source", "openfda_recall")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since = last?.fetched_at?.slice(0, 10) ?? "2020-01-01";
  const result = await ingestOpenFdaRecalls(since);

  return NextResponse.json({ ok: true, result });
}
```

**`vercel.json` additions:**

```json
{
  "crons": [
    { "path": "/api/cron/ingest-openfda-recalls", "schedule": "0 2 * * *" },
    { "path": "/api/cron/ingest-openfda-caers",   "schedule": "0 3 * * *" },
    { "path": "/api/cron/ingest-fda-warnings",    "schedule": "0 4 * * *" },
    { "path": "/api/cron/run-normalizer",         "schedule": "*/15 * * * *" }
  ]
}
```

Daily cadence is sufficient — FDA does not post multiple times per day. Normalizer runs every 15 minutes to keep queue drained.

---

## Task 11 — Display components

Two pieces of UI need to consume compliance data:

### 11.1 Flag badge

**File:** `src/components/ComplianceFlagBadge.tsx`

Small component that renders a severity dot + flag type label + date. Used in product cards, manufacturer pages, and the practitioner dashboard.

```tsx
const SEVERITY_COLORS: Record<string, string> = {
  critical:      "bg-red-100 text-red-900 ring-red-200",
  major:         "bg-amber-100 text-amber-900 ring-amber-200",
  minor:         "bg-yellow-100 text-yellow-900 ring-yellow-200",
  informational: "bg-blue-100 text-blue-900 ring-blue-200",
};
```

Keep severity color semantics consistent with the rest of the app — reuse existing Tailwind palette tokens where present.

### 11.2 Flag list section on product scorecard

**File:** `src/app/score/[slug]/page.tsx` (or wherever product scorecards live — search for existing product page patterns first)

Under the Safety and Transparency dimension breakdowns, show up to 3 most recent flags with:

- Flag type + severity badge
- Date
- One-sentence reason (truncated)
- Source link ("View on FDA.gov →")
- "Show N more" expander for additional flags

---

## Task 12 — Admin review UI

**File:** `src/app/admin/compliance/page.tsx`

Gate behind the existing `hasAdminSession()` check. Minimal interface:

- List of pending `ingestion_review_queue` rows
- For each: show raw data, proposed flag, matched entity (if any), confidence, source link
- Buttons: Approve / Reject / Modify (JSON editor for modifications)
- Audit trail in `ingestion_review_queue.decision` and `modifications` columns

Does not need to be pretty. Needs to be correct and fast — this is how we keep false-positive compliance claims out of production.

---

## Task 13 — Testing

**Minimum test coverage:**

1. **Fixture-based normalizer tests.** Save one real response from each source as JSON in `tests/fixtures/ingestion/`. Assert normalizer produces expected flag + severity.
2. **Idempotency.** Run ingestion twice against a mock; assert second pass produces 0 new + 0 changed, all unchanged.
3. **Rate limiter.** Fire 50 concurrent `govFetch` calls to one host; assert wall-clock time ≥ 50/rps seconds.
4. **Selector regression.** For `fda-warnings.ts`, fetch a pinned public page (cached in the repo) and assert row extraction produces at least 5 letters. Run in CI daily, not just on deploy.
5. **Matching thresholds.** Given fixture firm names ("Thorne Research Inc.", "THORNE HEALTHTECH"), assert they match to the same manufacturer with confidence ≥ 0.85.

Test framework: use whatever is already wired in the project (search `package.json` devDeps and config files). If nothing is wired, set up Vitest — it's the path of least friction for Next.js 16.

---

## Task 14 — VSF score integration

After flags are populating, wire into the existing scoring engine:

**File:** `src/lib/scoring-engine.ts` (locate actual path; may differ)

Two hooks:

1. **Safety dimension (15%):** subtract weighted flag severity from base safety score. Critical = -35, major = -15, minor = -5, informational = 0. Cap at 0.
2. **Transparency dimension (12%):** add +10 for products with zero flags on record AND verified brand (`manufacturers.gmp_certified = true`). This rewards demonstrated clean operation, not just absence of flags.

The `recalculate_compliance_score()` database function built in Task 2 handles product-level aggregate scoring. The VSF Safety + Transparency weights pull from that aggregate.

---

## Deliverables checklist

- [ ] `src/app/bot/page.tsx` — bot identity page
- [ ] `supabase/migrations/20260419_compliance_flags_and_ingestion.sql` — schema + RLS + trigger + function
- [ ] `src/lib/ingestion/client.ts` — rate-limited gov fetcher + hash util
- [ ] `src/lib/ingestion/persist.ts` — upsertRaw helper
- [ ] `src/lib/ingestion/openfda-recalls.ts` — recalls pipeline
- [ ] `src/lib/ingestion/openfda-caers.ts` — CAERS pipeline
- [ ] `src/lib/ingestion/fda-warnings.ts` — warning letters scraper
- [ ] `src/lib/ingestion/match.ts` — firm → manufacturer matcher
- [ ] `src/lib/ingestion/normalize.ts` — raw → flag normalizer
- [ ] `src/app/api/cron/ingest-openfda-recalls/route.ts`
- [ ] `src/app/api/cron/ingest-openfda-caers/route.ts`
- [ ] `src/app/api/cron/ingest-fda-warnings/route.ts`
- [ ] `src/app/api/cron/run-normalizer/route.ts`
- [ ] `vercel.json` updated with 4 new cron entries
- [ ] `src/components/ComplianceFlagBadge.tsx`
- [ ] Flag list rendering integrated into product scorecard (and/or protocol page)
- [ ] `src/app/admin/compliance/page.tsx` — review UI
- [ ] VSF scoring engine updated to consume `compliance_score`
- [ ] Tests: normalizer fixtures, idempotency, rate limiter, selector regression
- [ ] Environment docs updated (`.env.production.example`, `docs/ENV-SETUP.md`)

---

## What NOT to do

- **Never auto-publish a compliance match below 0.85 confidence.** Defamation risk. Review queue, always.
- **Never show individual CAERS reports to end users.** CAERS is voluntary with no causation. Aggregate at the ingredient level only, and never publish aggregates that identify specific products from individual reports.
- **Never scrape Examine, ConsumerLab, Labdoor, NSF, USP, or Informed Sport.** Those are licensed or manually curated (see `.agents/certification-integration-agent.md`). This pipeline is federal-only.
- **Never bypass `govFetch`.** Every outbound request to a government domain goes through the rate-limited, identified client — no direct `fetch()` calls in the ingestion modules.
- **Never log full API keys in errors.** Redact `OPENFDA_API_KEY` from any stack trace before sending to error reporting.
- **Never page past 25,000 skip on openFDA.** Their hard cap. Split date windows instead.
- **Never mark a flag `resolved = true` without explicit evidence.** FDA close-out letters are the resolution signal; absence of evidence is not evidence of resolution.

---

## When to escalate to a human

Stop and ask Craig if:

- Any upstream API returns a response shape that doesn't match the interfaces in this document (structure change; normalizer needs spec update)
- Review queue depth exceeds 100 pending items sustained over a week (signals confidence thresholds are wrong or matching is too weak)
- Any source returns >10% 5xx errors for 3 consecutive cron runs (upstream outage — halt ingestion to avoid pummeling during their recovery)
- You hit a legal/ToS ambiguity — default to "don't ingest, ask"

---

## Success criteria

After 2 weeks of execution:

- [ ] All 7 database objects exist and pass RLS smoke tests
- [ ] Bot identity page is live at `/bot`
- [ ] At least 500 compliance flags ingested and normalized (FDA has accumulated thousands of supplement-relevant actions over the years — initial backfill should surface hundreds at minimum)
- [ ] At least 70% of ingested flags are matched to a manufacturer in the `manufacturers` table (rest in review queue)
- [ ] Admin review UI allows a human to clear the review queue in under 10 minutes per day
- [ ] At least one product page shows active compliance flags with source links
- [ ] VSF Safety dimension scores reflect compliance data — scoreable products with active critical flags have compliance_score < 65

---

*Last updated: 2026-04-19*
