# Brand Submission Flow — Execution Plan

**Goal:** Close the loop on Vyvata's long-term catalog growth engine.
Brands submit verified supplement data via `/submit`; Vyvata reviews;
approved submissions move the product from AI Inferred to Verified
tier. This is the path NSF, USP, and Consumer Reports all use —
submissions, not scraping.

**Sprint length:** 4–6 focused days.

**Status before this sprint:**
- ✅ Schema in place: `brand_accounts`, `product_submissions`
- ✅ Partial UI: `/brand/login`, `/brand/dashboard`, `/admin/submissions`
- ❌ No public entry point: `/submit` returns 404
- ❌ No submission form: brands can log in but can't submit
- ❌ No approval-to-scoring pipeline: admin can review but approval
  doesn't transfer data into the scored catalog
- ❌ No email touchpoints: no verification emails, no review notices
- ❌ No discoverability: methodology page promises submission but
  doesn't link anywhere

**Why this matters:**
- The methodology page publicly claims brands can submit. Currently
  false. Every day we don't ship this, the site makes a promise it
  can't keep.
- Manual enrichment maxes out around 200 products. Submission scales
  to 1000+ without additional Vyvata labor.
- Every Verified submission = one product moves up a tier. Visible
  proof the scoring engine gets more confident as brands engage.
- This is the Bucket A feature that unblocks monetization (affiliate
  integration lands on top of verified product data, not AI-inferred).

**Out of scope for this sprint (deferred to Bucket A phase 2):**
- Shopify Collective bulk-cart integration
- Payment/billing (verification is free forever)
- Multi-user brand accounts (one email per brand for now)
- Bulk CSV submission (single-product form only)
- Automated document OCR (human review reads uploads directly)
- Fullscript integration (separate partnership track)

---

## Critical non-negotiables (firm constraints for every agent)

These are not suggestions. They are the integrity boundary of the
product. If you find yourself violating one, stop and escalate.

1. **Verification is always free.** No tier of access, no paid submission,
   no "expedited review" upsell. The methodology page promises free
   forever. Code must reflect that forever.

2. **No auto-approval.** Every submission must be human-reviewed by
   Vyvata admin before its data enters the public catalog. If an agent
   proposes an auto-approve rule, reject it.

3. **Reviewer is identified.** Every approval writes `reviewer_email`
   to the submission row. Accountability trail is not optional.

4. **No submission data touches the public scorecard pre-approval.**
   Uploaded supplement facts panels, certifications, manufacturer
   details all live in the submission record until approved. Never
   leak into `/products/[slug]` from a draft or reviewing submission.

5. **Approved submission data writes to `products` + derivatives via
   a single transaction.** If the ingredient insert fails, the product
   update rolls back. Half-applied submissions corrupt scoring.

6. **`score_mode = 'verified'` only applies to brand-submitted data.**
   Never flip an AI Inferred score to Verified because a cert was seeded
   by our scraper — that's not what Verified means.

7. **Public copy stays evidence-forward.** Read `docs/BRAND-STORY.md`
   before writing any copy. No "AI-powered," no "wellness optimization,"
   no marketing hype. The submission flow is a governance process,
   not a growth funnel.

8. **Brand-submitted data is the brand's legal attestation.** UI must
   make this explicit (checkbox at submit time). Supabase RLS must
   prevent a brand from editing another brand's submissions.

9. **No impersonation.** A brand can only submit products for its
   claimed manufacturer. If `brand_accounts.manufacturer_id` is set
   and the submission's `claimed_brand` doesn't match, submission is
   rejected at API level before reaching review queue.

10. **All file uploads go through a Supabase Storage bucket with
    signed URLs for admin read, and no public access.** Brand
    facts-panel PDFs contain proprietary formulation details — treat
    them as confidential until (and if) the brand makes them public.

---

## Execution order (day-by-day)

Each day is a self-contained workstream with its own mission brief
in this folder. Run them in order. Each day's output is a PR-sized
commit you review before moving to the next.

**Day 1 — Audit & gap analysis** → [01-audit.md](./01-audit.md)
Read what's already built (`/brand/*`, `/admin/submissions`, schema).
Document exactly what's there, what's missing, what needs replacement.
Deliverable: an audit report, no code changes yet.

**Day 2 — Public `/submit` landing + brand account creation** →
[02-public-submit.md](./02-public-submit.md)
The public entry point. Landing page explains the free verification,
CTA goes to a brand signup form, signup creates a `brand_accounts`
row with email verification via Resend. Deliverable: working
`/submit` → signup → email verify → `/brand/dashboard`.

**Day 3 — Submission form + file upload** →
[03-submission-form.md](./03-submission-form.md)
The core form where a brand enters product data and uploads their
facts panel PDF. Multi-step, saves as `draft` status, brand can
return and edit. Supabase Storage bucket for uploads. Deliverable:
brand can submit a complete product for review.

**Day 4 — Admin review queue & approval pipeline** →
[04-admin-review.md](./04-admin-review.md)
Extend `/admin/submissions` so admin can review, request revisions,
approve, or reject. On approve: transactional write into `products`,
`product_ingredients`, `certifications`, trigger `rescoreProducts()`
with `score_mode = 'verified'`. Deliverable: submission → approval
→ verified scorecard appears on `/products`.

**Day 5 — Email flow + cross-site CTAs** →
[05-email-cta-glue.md](./05-email-cta-glue.md)
Transactional emails at every state transition (submitted,
reviewing, approved, revision_requested, rejected). Add submission
CTAs to methodology page, unscored scorecards, and homepage.
Deliverable: brand has a complete email-driven experience; site
surfaces submission path where it's useful.

**Day 6 — QA, smoke test, docs update** →
[06-qa-and-launch.md](./06-qa-and-launch.md)
End-to-end test of the happy path and rejection paths. Update
methodology page to reference the live flow. Brief for brand
outreach (Craig's manual work post-launch). Deliverable: live,
ready-to-announce flow.

---

## How to use these briefs

1. Open Day N's brief. Read the "Context" and "Constraints" sections.
2. Re-read the shared non-negotiables (`00-README.md` §Critical).
3. Do the work. Stage as a patch.
4. Write the deliverable report in `.agents/reports/submission-day-N-YYYY-MM-DD.md`.
5. Submit to Craig for review.
6. On approval: Craig applies the patch, merges, moves to Day N+1.

---

## Success criteria for the full sprint

**Technical:**
- `/submit` renders a public landing page
- A brand can sign up, verify email, and submit a complete product
- Admin can approve a submission and see the scored product appear
  on `/products` within 60 seconds of approval
- The product's scorecard shows `score_mode = 'verified'`
- All state transitions send appropriate emails

**Strategic:**
- Methodology page's "brands can submit for free" claim is
  demonstrably true
- Craig can send an email to a real brand ("here's your product
  scored, here's where to verify") and the brand can follow through
  without any manual intervention from Vyvata
- The admin review queue is pleasant enough that Craig is willing to
  do it daily

**Out of scope markers:**
- Not every brand will know to submit. That's Day 7+ — Craig's
  outreach work to brands currently AI-scored.
- Not every approved submission will tier up. Some will score lower
  than their AI-inferred score because verified data is stricter
  than optimistic inference. That's the right outcome.

---

## File output locations

- Mission briefs live in this folder (`docs/submission-flow/`)
- Agent reports write to `.agents/reports/submission-day-N-*.md`
- Agent patches land in `.agents/patches/submission-day-N-*.patch`
- Migrations land in `supabase/migrations/` with the standard
  `YYYYMMDD_descriptive_name.sql` pattern
- No agent commits or pushes without Craig's review
