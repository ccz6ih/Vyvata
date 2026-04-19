# Project State & Triage — April 2026

**Purpose:** A clear-headed snapshot of where Vyvata actually is, what's
broken, how to interpret the founder expansion email, and which agents
should own which manual work. Written after a polish pass that shipped
the homepage, methodology page, catalogue, scorecard, and OG rework.

**Use this doc when:** you feel the scope slipping, an agent needs a
playbook, or a conversation with the co-founder is about to confuse
shipped vs aspirational.

---

## 1. What's shipped and working

### Public surfaces
- `/` — reframed homepage, authority-first positioning, six-dimension
  breakdown matching `dimension-caps.ts`, static scorecard anatomy
  visual, protocol input relocated to second-fold
- `/methodology` — versioned v1.0, pulls weights from scoring engine,
  honest limitations section, governance principles, changelog
- `/products` — catalogue with tier distribution bar, sort/filter,
  unscored toggle, mini score rings per row, methodology CTA
- `/products/[slug]` — full scorecard with tier context caption, tabs
  (Overview / Evidence / Formulation / Data Sources), compliance flags
  banner, gap report, related products, share buttons, methodology CTA
- `/about` — brand story page, product count updated to 200+
- OG images — `/api/og/product` (trading card) and `/api/og` (protocol
  share) both reworked for brand voice and VSF tier colours

### Engine
- 152-ingredient clinical library with evidence tiers, interactions,
  synergies, cycling flags
- Deterministic rules engine with severity classification
- 5 protocol templates, each PubMed-cited
- Six-dimension VSF scoring (`product-scoring.ts` + `dimension-caps.ts`)
- Two-path scoring architecture (AI Inferred + Verified)
- Claude synthesiser with deterministic fallback

### Data infrastructure
- Supabase: 10+ tables wired (products, product_scores, ingredients,
  certifications, compliance_flags, etc.)
- Compliance scrapers written: FDA Warning Letters, openFDA recalls,
  CAERS, NSF, USP, Informed Sport
- Admin UI for compliance flag review
- Practitioner B2B tier (auth, dashboard, patient links, admin approval)

### Brand coherence
- Nav is consistent across homepage / catalogue / scorecard / methodology
- Tier colours (Elite purple, Verified teal, Standard amber, Rejected
  red) synchronised across scorecard rings, catalogue rows, tier
  distribution bar, OG images
- Brand voice in `docs/BRAND-STORY.md` is the source of truth. Current
  copy does not contain the previously-violating phrases ("optimise",
  "biohack", "AI-powered wellness intelligence", "AI-POWERED HEALTH
  PROTOCOL ENGINE")

---

## 2. What's shipped but unverified or degraded

Every item below is a public claim not yet proven operational. This is
the list that keeps the brand honest.

### Critical — the methodology page publicly claims these are live

- **Compliance cron in `vercel.json`.** Scrapers exist, cron
  configuration status unknown. If not firing, the methodology-page
  claim "scores re-compute automatically when FDA warning letters land"
  is false.
- **`rescoreProducts()` orchestrator.** Called from the cron chain. If
  the cron doesn't fire, this doesn't run.
- **Certification seeding.** NSF / USP / Informed Sport registries.
  Craig reports "running into issues" here.
- **Brand / manufacturer addition pipeline.** Craig reports this is
  breaking. Affects Manufacturing dimension scoring.

### Important — operational health

- **`ANTHROPIC_API_KEY`.** If unset in prod, reports use the
  deterministic fallback. Degrades report personalisation; doesn't
  break the product.
- **`VYVATA_ADMIN_SECRET`.** If unset, `/admin` is inaccessible.
- **Resend sender domain.** SPF / DKIM / DMARC alignment unverified.
  Mail may be landing in spam.
- **Rate limiter.** In-memory sliding window, won't survive multi-
  instance deployment on Vercel.

### Nice to verify

- **OG smoke test** (`npm run smoke:og`). Known Satori crash triggers,
  silent 0-byte failure mode. Should be re-run after the OG rework.
- **`score_mode` migration** (`20260420_score_mode.sql`). Scorecard
  mode toggle depends on this column being in place.

---

## 3. Founder email triage

The email from your co-founder proposes two distinct expansions.
Treating them as a single ask is where the "losing what this is or
isn't" feeling comes from — they are genuinely different decisions
and should not be confused.

### Bucket A — Natural evolution of what's already built

These extend the supplement system. Additive, don't change core
architecture, and they open a monetisation path.

- **Personal score interpretation.** Guidance on what a personal
  protocol score means at each tier. Copy / doc change, no code.
- **Protocol reorganised as Keep / Add / Drop.** The rules engine
  already produces these signals — it's a UI reorganisation of
  `ProtocolClient.tsx`.
- **Tiered brand recommendations per ingredient.** Even for "Keep"
  items: "we don't know which Magnesium version you take, click to
  see the scored list." New route or modal, filters `/products` by
  ingredient.
- **Compare-by-price within a recommendation list.** Your schema
  already has `price_per_serving`. Secondary sort control.
- **Affiliate links and hot-purchase CTAs.** New `affiliate_urls`
  table keyed on `product_id`. Revenue.
- **Bulk add-to-cart via Shopify Collective.** The one piece in
  Bucket A that's genuinely hard. Possible scoping: start with
  simple external affiliate links, add Collective bulk-cart when
  volume justifies the build.

**Time estimate for Bucket A**, once the data pipeline is actually
running reliably: 3–5 weeks of focused work.

### Bucket B — Major scope expansion

Non-supplement categories. 14 top-level categories, hundreds of
subcategories, a different scoring rubric per category, and a
flexible entry UX that doesn't require the quiz.

This is a different product. Not unreasonable — users DO search "best
red light panel" without wanting a personalised quiz — but it changes
what Vyvata is. Current positioning: "independent integrity score for
supplements." Founder vision: "independent integrity score for
everything you put on or around your body."

The questions this decision requires, named plainly:

1. **Category scoring rubrics.** The supplement VSF (Evidence,
   Formulation, Manufacturing, Safety, Transparency, Sustainability)
   doesn't map cleanly to a cold plunge tub. Each category needs its
   own rubric, which means each category is essentially a new product
   line with its own methodology page. One rubric is attached — that
   is 1 of 14.

2. **Data source strategy.** Supplements have NIH DSLD, FDA CAERS,
   NSF, USP — clean federal registries. Cold plunges, saunas, red
   light panels have no equivalent registry. The "opacity scores
   zero" principle can't transplant cleanly when there is no
   authoritative source against which to score opacity.

3. **Flexible entry UX (browse vs quiz).** This is orthogonal to
   Bucket A or B — it's a UX change that applies to both. Users
   landing on `/products` today can already browse without taking
   the quiz, but the nav doesn't emphasise this. The "browse by
   category" pattern is a quick win that doesn't require Bucket B.

4. **Scoring-authority brand risk.** Today's claim: "independent
   integrity scoring for supplements, backed by federal data."
   Extending to 14 categories without federal data sources per
   category dilutes the authority. Worth getting right before a
   skeptical journalist asks "so how do you score a red light
   panel's Safety when there's no FDA CAERS for red light panels?"

### Recommendation on the founder email

**Ship Bucket A first. Defer Bucket B until Bucket A is running.**

Reasons:

- Bucket A proves the monetisation loop (affiliate revenue) on a
  system you already have defensible data for. The founder's revenue
  argument is real but depends on the scoring being trusted — trust
  is easier to maintain on one category before extending to fourteen.
- Bucket B is a 3–6 month project at minimum. Starting it before
  Bucket A means nothing ships for months and neither business proves
  out.
- The flexible entry UX from Bucket B (category browse, no quiz
  required) IS worth carrying forward into Bucket A — just as "browse
  supplements by category" rather than "take the quiz." That's a
  quick win and validates the UX pattern before it needs to work for
  fourteen categories.

This isn't "tell the co-founder no." It is "Bucket A proves the
model; Bucket B extends the model once it's proven."

If the co-founder pushes back, the question to surface is: what is
the actual revenue gap between Bucket A at 1,000 supplement products
with affiliate links, and Bucket B at 14 categories with partial
coverage and no federal data backbone? Bucket A on mature
infrastructure likely out-earns Bucket B in year one. Bucket B wins
long-term but loses the opportunity cost fight in the short term.

---

## 4. Agent assignments

Your operational problems are concrete. Each deserves a dedicated
agent run with a clear playbook and success criteria.

### Agent 1: Supabase Health Auditor

**Base role:** `.agents/supabase-guardian.agent.md` with an ops-check
playbook.

**Scope:**
- Inventory every table's row count, most-recent write, and
  expected-vs-actual write cadence per pipeline
- Verify cron configuration in `vercel.json` and cross-reference
  against the scrapers in `src/lib/scrapers/` and
  `src/lib/compliance/`
- Check Vercel cron execution logs for the last 7 days (or Supabase
  pg_cron logs if that's where jobs live)
- Identify stuck records: `compliance_flags.review_status = pending`
  older than 14 days, manufacturers with no certification sync row,
  products with no `product_scores` row, products with
  `score_mode = 'ai_inferred'` but missing per-dimension scores
- Verify applied migrations: `schema_migrations` cross-referenced
  with `supabase/migrations/` folder
- Confirm environment variables in production:
  `ANTHROPIC_API_KEY`, `VYVATA_ADMIN_SECRET`, `RESEND_API_KEY`,
  `NEXT_PUBLIC_APP_URL`, Supabase keys

**Deliverable:** a single markdown report at
`.agents/reports/supabase-health-YYYY-MM-DD.md` with a status table
(Green / Yellow / Red per subsystem) and a prioritised fix list.

**Success criteria:** Craig can look at the report and know in 60
seconds which pipelines are actually running vs which are silent
failures.

### Agent 2: Seeding & Ingestion Agent

**Base roles:** `.agents/product-auto-import-agent.md` combined with
`.agents/certification-integration-agent.md`.

**Scope:**
- Push product count from 205 → 400+ via DSLD auto-import (script
  already exists at `scripts/auto-import-products.ts`)
- Seed NSF / USP / Informed Sport certifications for the top 30
  brands by product count in the DB
- Backfill `manufacturer_id` on any products missing it (required
  for compliance flag matching)
- Run `rescoreProducts()` after each ingest batch so new certifications
  actually lift scores rather than sitting latent

**Deliverable:** a running log at `.agents/ingestion-log.md` with
per-batch counts, errors, and before/after scoring deltas. Weekly
summary.

**Success criteria:** by end of next week, the Manufacturing-dimension
median score across the catalogue rises measurably because
certifications are seeded, and the tier distribution bar on
`/products` shows more Verified and Elite entries than today.

### Agent 3: Validator / Error Sweeper

**Base role:** `.agents/vyvata-orchestrator.agent.md` with a QA
mandate.

**Scope:**
- Crawl every public route (`/`, `/methodology`, `/products`,
  `/products/[slug]` for 3 sample products spanning tiers, `/about`,
  `/practitioner/register`) and report:
  - Console errors
  - Broken images or 404 links
  - Any href pointing to `/submit` (the methodology page promises
    submission — any CTA that 404s breaks a public commitment)
  - Any copy still using banned brand-voice words from
    `docs/BRAND-STORY.md`
- Run the OG smoke test (`npm run smoke:og`) post-deploy; flag any
  0-byte PNG responses
- Run Lighthouse on homepage and a scorecard; track score regressions
  across sessions
- TypeScript: `npm run build` must pass clean. Flag any `any` escape
  hatches added since last audit
- Verify no environment-variable leaks in client-side bundles

**Deliverable:** weekly QA report at
`.agents/reports/qa-sweep-YYYY-MM-DD.md` with issues prioritised by
severity (public-facing broken > broken > regression > polish).

**Success criteria:** no public surface is broken or quietly breaking
a brand-story commitment.

### Agent 4: Compliance Cron Validator

**Base role:** `.agents/continuous-monitoring-agent.md`.

**Scope:**
- Confirm every scraper in `src/lib/compliance/` and
  `src/lib/scrapers/` has a corresponding entry in `vercel.json` cron
- Run each scraper manually in a dev environment; record last
  successful run per scraper
- Detect stale data: if a scraper hasn't run successfully in >48
  hours, surface it loudly
- Wire up structured logging per scraper run (success / failure,
  rows inserted, errors encountered) — write to a
  `scraper_runs` table in Supabase so there's a history

**Deliverable:** a cron-health dashboard. Simplest version is an
admin page at `/admin/cron` showing last-run status per scraper.
Even simpler MVP: a markdown file updated on each run.

**Success criteria:** the methodology-page claim "scores re-compute
automatically when FDA warning letters land" is demonstrably true —
you can point to a scraper run in the last 48 hours that produced a
score delta on a real product.

---

## 5. Critical path forward

In order. Do not skip ahead.

1. **Agent 1 runs.** Supabase Health Auditor produces the status
   report. Duration: 1–2 days including your review. Output: a table
   that tells you exactly which pipelines are green, yellow, red.

2. **Fix whatever's red or yellow.** This probably means: wiring
   missing cron entries, applying missing migrations, setting missing
   env vars, repairing whichever seeding script has been breaking.
   Do not move on to new features until this is done.

3. **Agent 4 validates.** The cron-health dashboard confirms scrapers
   fire on schedule. Proof that the methodology page tells the truth.

4. **Agents 2 and 3 run in parallel** once the foundation is solid.
   Agent 2 pushes data volume; Agent 3 sweeps for regressions.

5. **Make the Bucket A vs Bucket B decision** explicitly with your
   co-founder. Write the decision down in `docs/BUCKET-DECISION-
   YYYY-MM-DD.md`. Don't let the expansion email sit in your inbox
   as mental weight.

6. **If Bucket A:** Keep / Add / Drop protocol reorganisation first
   (~1 week), then tiered brand recommendations modal / page (~2
   weeks), then affiliate integration (~1 week).

7. **If Bucket B, later:** Author a second scoring rubric methodology
   first. Ship it publicly. Only after that is accepted publicly do
   you start ingesting category-1 products.

---

## 6. What to stop doing manually

- Adding products one-by-one — Agent 2 handles this
- Seeding certifications one-by-one — Agent 2 handles this
- Visually checking scorecards render correctly — Agent 3 handles this
- Tracking which scrapers ran when — Agent 4 handles this
- Copy polish against brand voice — Agent 3 handles this

Save your manual attention for:

- The Bucket A vs Bucket B decision and the conversation with your
  co-founder
- Reviewing agent output and unblocking them when they hit a real
  structural question (schema change, new migration, new scoring rule)
- Relationship and legal decisions — brand submission approvals,
  eventual Standards Board recruitment, practitioner partnerships
- Strategic scope decisions no agent can make for you

---

## 7. What this doc is not

This doc is not:

- A feature roadmap. `docs/EXECUTION-ROADMAP-2026-04.md` is the
  roadmap.
- A methodology specification. `src/lib/scoring/dimension-caps.ts` +
  `/methodology` are the spec.
- Permission to expand scope. Scope decisions belong between you and
  your co-founder, not in an agent handoff doc.

This doc is:

- A snapshot of what's real, what's broken, and what's noise.
- A delegation map so the manual work you've been absorbing has an
  owner that isn't you.
- A guardrail against mistaking "shipped code" for "working system"
  — the two diverge under load and the methodology page makes public
  promises that only stay honest if the pipelines actually run.

---

*Written 2026-04-20. Next review: after Agent 1 produces the Supabase
Health report.*
