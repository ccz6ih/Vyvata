# Execution Roadmap — April 2026

> **Purpose:** Sequence the three plans — strategic, close-the-loop, UI V2 + submission — into a single roadmap you can work through in order. This is the doc to read when you're not sure what to do next.

---

## Where we are

Vyvata as of today is a working Next.js 16 app with:

- Functional scoring engine (152 ingredients, 40 evidence summaries, interaction detection)
- Working compliance scrapers (FDA warnings, openFDA recalls, NSF / USP / Informed Sport)
- Admin UI for compliance flag review
- Practitioner B2B tier (auth, dashboard, patient links, admin approval)
- Consumer-facing scorecard at `/products/[id]`
- Manual sync from admin, but no automation
- UUID-based product URLs (not shareable)
- No brand submission flow
- No score mode distinction between "inferred from public data" and "verified by brand"

Three documents frame what's next:

| Doc | Scope |
|---|---|
| `STRATEGIC-REVIEW-2026-04.md` | Strategic framing — what VSF is, risks, the four edges, the acquisition-loop gap |
| `docs/CLOSE-THE-LOOP-PLAN.md` | Wire what's built — automation, rescore, slug URLs, OG images, share buttons |
| `docs/UI-V2-AND-SUBMISSION-PLAN.md` | Add two-path scoring, gap reports, scorecard redesign, brand submission portal |

This document is the sequencing layer over those three.

---

## The phased plan

### Phase 1 — Close the Loop (in progress)
**Source:** `docs/CLOSE-THE-LOOP-PLAN.md`
**Goal:** Every piece already built in the codebase starts running itself and producing shareable output.
**Estimated remaining:** 2-4 days (Craig is mid-execution)

**Gap 1:** Automated compliance sync — cron endpoints in `vercel.json` for `sync-recalls`, `sync-warning-letters`, `sync-certifications`, `rescore-products`.

**Gap 2:** Close compliance → score loop — `rescoreProducts()` orchestrator that picks up changed flags and writes new `product_scores` rows.

**Gap 3:** Slug URLs — `/products/[slug]` with 308 redirect from UUID, sitemap generation.

**Gap 4:** Product-specific OG image — trading-card layout at `/api/og/product`.

**Gap 5:** Share buttons — Twitter / LinkedIn / Copy Link on the scorecard.

**Exit criteria:** A real product's score drops automatically within 24h of a matched FDA warning letter landing in the DB, and the scorecard URL renders a trading-card OG when posted on social.

---

### Phase 2 — Two-path scoring data model (next)
**Source:** `docs/UI-V2-AND-SUBMISSION-PLAN.md` Sections 1–2
**Goal:** Encode the AI Inferred vs Verified distinction in the data model and scoring engine.
**Estimated:** 2-3 days

**Deliverables:**
- Migration `20260420_score_mode.sql` — adds `score_mode` column, unique-per-mode index, backfill
- `src/lib/scoring/dimension-caps.ts` — calibrated `publicMax` and `intakeBonus` per dimension
- `src/lib/product-scoring.ts` — `scoreProductDual()` that returns both AI and Verified (when data exists)
- `src/lib/scoring/gap-report.ts` — pure function computing verification upside
- Update rescore job from Phase 1 to write both score rows when applicable

**Exit criteria:** `SELECT COUNT(*) FROM product_scores WHERE score_mode='ai_inferred' AND is_current=true` equals the total count of active products. `calculateGapReport()` returns sensible numbers for a product with mixed public data availability.

**Why this phase comes before UI redesign:** the UI toggles between AI and Verified. Without the data model split, the toggle has nothing to switch between.

---

### Phase 3 — Scorecard UI V2
**Source:** `docs/UI-V2-AND-SUBMISSION-PLAN.md` Section 3
**Goal:** Redesign the public scorecard to match the mockup's information architecture using existing Vyvata visual tokens.
**Estimated:** 3-5 days

**Deliverables:**
- Server/client component split of `src/app/products/[slug]/page.tsx`
- 12 sub-components (ScoreRing, AnimatedScore, ScorecardHero, tabs, etc.)
- Four-tab structure: Overview / Evidence / Formulation / Data Sources
- Score history timeline (reads from non-current `product_scores` rows)
- Related products section (same-category query)
- Score mode toggle (wired to Phase 2 data)
- Purple tier color for Elite (90-100) added to tokens

**Exit criteria:** A reviewer can land on the scorecard, toggle between AI and Verified modes (on a product with both), browse all four tabs, and see three related products from the same category. OG image still works (unchanged from Phase 1).

---

### Phase 4 — Gap Report on scorecard
**Source:** `docs/UI-V2-AND-SUBMISSION-PLAN.md` Section 2 (UI surface)
**Goal:** When viewing a product in AI Inferred mode, show the brand the specific upside available from verification.
**Estimated:** 1 day

**Deliverables:**
- `GapReportBlock.tsx` component rendered on scorecard when `mode === 'ai_inferred' && totalUpside > 0`
- "Submit for Verification" CTA that deep-links to `/submit?product={slug}`

**Exit criteria:** Pick any AI-only product. The block shows a correct potential score and lists the top 3 upside dimensions with intake bonus values.

**Why this is its own phase:** it's small and high-signal — getting it in front of brands quickly helps motivate Phase 5 work.

---

### Phase 5 — Brand Submission Portal
**Source:** `docs/UI-V2-AND-SUBMISSION-PLAN.md` Section 4
**Goal:** Brands can sign in, see their products, submit documentation, and receive Verified scores after admin approval.
**Estimated:** 7-10 days — this is the biggest single chunk

**Sub-phases:**

**5a. Auth + schema (1-2 days)**
- `20260420_brand_submissions.sql` migration
- Magic-link auth flow for brand accounts
- Supabase Storage bucket

**5b. Submission form (2-3 days)**
- 4-section form (Identity, Manufacturing, Clinical, Safety/Transparency)
- File upload endpoint
- Auto-populate from public data where possible
- Draft save + resume

**5c. Brand dashboard (1-2 days)**
- List submissions by product
- Gap report per product
- Submission status tracking

**5d. Admin review UI (2-3 days)**
- Review queue
- Approve / Reject / Request Revision actions
- Trigger rescore on approval
- Resend emails for each state transition

**Exit criteria:** A brand signs up with their email, receives a magic link, lands on dashboard, selects their product, fills and submits the form, uploads a CoA. You approve it in admin. Their scorecard shows Verified tier within 30 seconds.

---

### Phase 6 — Living protocols (optional, high-retention)
**Source:** `STRATEGIC-REVIEW-2026-04.md` Edge 2
**Goal:** Practitioner protocols that notify when a constituent product's VSF score changes.
**Estimated:** 3-5 days (once Phases 1-5 are solid)

**Deliverables:**
- Snapshot product scores at time of protocol creation
- Compare on a schedule (daily?) to current scores
- If a product has dropped a tier or gained a critical flag, send a notification to the practitioner with alternatives from the same category
- In-dashboard diff view per patient

**Exit criteria:** A protocol recommending Thorne Magnesium Glycinate automatically flags when Thorne's score drops. Practitioner gets an email with one-click suggested replacement.

---

### Phase 7 — Messy-input ingestion
**Source:** `STRATEGIC-REVIEW-2026-04.md` Edge 3
**Goal:** Practitioners can submit a photo of a patient's supplement shelf, get parsed ingredients.
**Estimated:** 3-5 days

**Deliverables:**
- GPT-4o vision endpoint: image → array of `{brand, product_name, dose_text}`
- Fuzzy match against DSLD / products table
- Confidence-based review queue for ambiguous matches
- Practitioner-facing UI at `/practitioner/intake/photo`

**Exit criteria:** Upload a real photo of 6 bottles. System identifies at least 5 correctly within 30 seconds.

---

### Phase 8 — Outcomes correlation (the 12-month moat)
**Source:** `STRATEGIC-REVIEW-2026-04.md` Edge 4
**Goal:** T+30 / T+90 follow-up emails to every audit. Aggregate into population-level outcome signals.
**Estimated:** 2-3 days to build, 12 months to matter

**Deliverables:**
- Scheduled Resend emails via cron
- Single-question response form (did it help? yes / somewhat / no / stopped taking)
- Outcome aggregation view per ingredient + goal combo
- Admin-only visualization for internal use; public release decision later

**Exit criteria:** 1000 audits with ≥40% response rate at T+30. The data becomes interesting at volume, not at launch.

---

### Phase 9 — Governance, billing, scale
**Source:** `STRATEGIC-REVIEW-2026-04.md` / `VSF-ROADMAP.md`
**Goal:** Make the business defensible at scale.
**Estimated:** Months

- Standards Board recruitment (6-8 independent credentialed experts)
- Public methodology documentation
- Stripe billing tiers for practitioners
- HIPAA review (BAAs with Supabase, Resend, Anthropic; audit logs; encryption at rest)
- Load testing
- End-to-end Playwright suite
- Sentry / observability

None of this is urgent until real traffic or paying practitioners exist.

---

## Honest timeline

**1 dev + Claude working part-time:**
- Phases 1-5 (scorecard, pipelines, submission portal): **3-4 weeks**
- Phase 6 (living protocols): **+1 week**
- Phase 7 (messy input): **+1 week**

That's **6-7 weeks** of focused solo work to land Phases 1-7.

**If your partner picks up Phase 4 + parts of Phase 5:** probably 4-5 weeks total.

Phase 8 is real in 12 months regardless of how fast you ship infrastructure.
Phase 9 is not on this timeline.

---

## Decision points worth naming

1. **Calibrating `dimension-caps.ts` values.** The friend's mockup had arbitrary numbers. The current plan has honest estimates but they should be tuned after scoring 20-30 real products and seeing what feels right. Don't ship the first draft as gospel.

2. **Whether to publish scorecards that have zero brand submission.** The current architecture allows this — every product gets an AI Inferred score whether the brand participated or not. This is Cloudflare-style ("opacity is penalized by absence of data"). It's the right default. But be prepared: brands will email complaining. Having a published methodology and a frictionless submission path is how you answer them.

3. **Vendor portal pricing.** The `docs/UI-V2-AND-SUBMISSION-PLAN.md` assumes brand submission is free. The `STRATEGIC-REVIEW-2026-04.md` flagged this as a governance concern (free = scalable but risks being seen as pay-to-play later if you ever monetize it; paid = cleaner boundary but slows adoption). Defer this decision until after 20 brands have submitted organically.

4. **Whether to auto-approve trivially verifiable submissions.** A brand confirming an NSF certification that the public registry already shows? Tempting to auto-approve. Don't. Every verified-mode transition is a credibility-critical action. Human gate.

5. **When to recruit the Standards Board.** Right answer: after 100+ products are scored and at least 10 practitioners are actively using the platform. Before that, a "board" would be symbolic rather than substantive.

---

## When to revisit this roadmap

- After Phase 1 complete: update Phase 2 estimate based on what you learned about the codebase.
- After Phase 3 complete: assess whether the UI V2 looks right or needs iteration — don't skip straight to Phase 5 if the scorecard feels off.
- After Phase 5 complete: **big decision point.** You have the complete VSF loop. Now you decide whether to push toward practitioner distribution (Phase 6-7) or consumer distribution (growth marketing, PR, SEO). This is the first real "business mode" decision the project needs to make.

---

## The one thing to remember

You have a working system that does something nobody else does. The mockup your collaborator sent is a design spec for how to make it beautiful. Both are true. The work ahead is to land them together without letting either one win at the other's expense — functional pipeline + sharp design + clear business loop.

Have fun with it.

---

*Last updated: 2026-04-20*
