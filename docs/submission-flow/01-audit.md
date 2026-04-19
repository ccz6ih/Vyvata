# Day 1 — Audit & Gap Analysis

**Role:** Senior developer doing a read-only walkthrough before touching code.

**Goal:** Produce a definitive map of what's already built vs what's missing
for the submission flow. The next 5 days of work depend on knowing where
to extend existing code and where to build from scratch.

**Do not write code today.** Read, inventory, and report.

**Read first before starting:**
- `docs/submission-flow/00-README.md` — especially §Critical non-negotiables
- `docs/BRAND-STORY.md` — the brand-voice source of truth

---

## Scope — every file to inventory

### Schema
Query Supabase and read the actual current state (not just the migration files):
- `brand_accounts` — all columns, constraints, RLS policies, row count
- `product_submissions` — all columns, constraints, RLS policies, row count
- `manufacturers` — how `brand_accounts.manufacturer_id` links
- Any Supabase Storage buckets — exist? policies? signed-URL support?

Cross-reference against `supabase/migrations/20260420_brand_submissions.sql`
and any later migrations that touched these tables. Flag any drift
between the migration files and production schema.

### Existing routes
Read every file, summarize what it does, flag what's missing:
- `src/app/brand/login/page.tsx` — login mechanism (password? magic link? OAuth?)
- `src/app/brand/dashboard/page.tsx` — what does a brand see after login?
- `src/app/admin/submissions/page.tsx` + `AdminSubmissionsClient.tsx` — review
  UI features, what can admin do today?
- `src/app/api/` — any brand-related API routes? Submission endpoints?

### Auth infrastructure
- Is there a brand session / middleware?
- Cookie name, session storage, expiry
- How is `brand_accounts.email_verified_at` set today (if at all)?
- Is there overlap or conflict with the practitioner auth flow?

### Scoring integration
- `src/lib/product-scoring.ts` — how is `score_mode = 'verified'` currently
  triggered? Is there a code path? Is it dead code?
- `src/lib/scoring/rescore-job.ts` — does it handle verified-mode scoring
  differently from AI-inferred?
- The `score_mode` column on `product_scores` — what writes to it?

### Email / notifications
- Resend integration exists (`RESEND_API_KEY` is an env var). Where is
  it used today? Templates? Sender domain? Deliverability status?
- Any existing template for brand emails?

---

## Deliverable — `.agents/reports/submission-day-1-YYYY-MM-DD.md`

Structure the report as follows:

```
# Submission Flow — Day 1 Audit

## Summary
[One paragraph: how much of the work is done, how much is ahead]

## What's built (green — reuse)
[Per component, what exists and what it does]

## What's partial (yellow — extend)
[Per component, what exists and what's missing]

## What's missing (red — build new)
[Per component, what needs to be written]

## Schema state
| Table/bucket | Exists | Columns OK | RLS OK | Notes |
|---|---|---|---|---|
| brand_accounts | | | | |
| product_submissions | | | | |
| uploads bucket | | | | |

## Auth model
[How brand auth works today; recommended model for this sprint]

## Scoring integration path
[How an approved submission should write into products + derivatives]

## Risks & open questions
[Anything that might block Days 2-6]

## Recommended adjustments to Days 2-6
[If the audit reveals work already done, propose removing it from the
sprint. If the audit reveals undocumented dependencies, propose adding
them.]
```

## Success criteria

- Craig can read the audit and know exactly which Day 2-6 mission briefs
  need to be adjusted before they execute
- No file relevant to submission flow is left un-inventoried
- Every RLS policy on `brand_accounts` and `product_submissions` is
  documented (or flagged as missing)
- The auth model question is answered definitively ("brand login works
  via X today; we should extend it with Y" or "brand login is stubbed;
  we need Z")

## Constraints

- Read-only. Do not modify code, schema, or data.
- If something is unclear, mark it with 🟡 Unknown and flag the question —
  don't guess.
- If you find existing code that conflicts with the sprint's non-negotiables
  (e.g., auto-approval logic, paid-tier flags), flag loudly in the report.
