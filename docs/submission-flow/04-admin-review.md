# Day 4 — Admin Review Queue & Approval Pipeline

**Role:** Full-stack engineer. Extend the admin review UI so Craig
can triage submissions, and build the approval transaction that
transfers submitted data into the public scored catalogue.

**Prerequisite:** Day 3 complete. Brands can submit; a row lands in
`product_submissions` with `status = 'submitted'`. The admin UI
(`src/app/admin/submissions/`) exists but likely displays submissions
without a review action.

**Read first:**
- `docs/submission-flow/00-README.md` §Critical non-negotiables
- Day 1 audit — what the existing `AdminSubmissionsClient.tsx` does
- `src/lib/product-scoring.ts` — how scoring produces a row
- `src/lib/scoring/rescore-job.ts` — where Verified mode plugs in

---

## Scope

### 1. Admin review queue UI

Extend `src/app/admin/submissions/page.tsx` + `AdminSubmissionsClient.tsx`:

**Queue view:**
- Sort order: oldest `submitted_at` first (FIFO — first come, first reviewed)
- Filter chips: All / Submitted / Reviewing / Approved / Rejected / Needs Revision
- Per-row: company name, product name, category, submitted date,
  status, "Open" action
- Badge showing "X submissions waiting" count in nav for admin

**Detail view — `/admin/submissions/[id]`:**
Server component that loads submission + brand account + uploaded files
with signed URLs for admin read.

Two-column layout:
- Left: all submitted data laid out for review — product identity,
  ingredients table, certifications, attested claims
- Right: uploaded documents. Each file is a clickable preview (PDF
  inline, image inline). Signed URLs expire after 1 hour.

Action bar at top:
- "Claim for review" button → sets `status = 'reviewing'`, writes
  `review_started_at = NOW()` and `reviewer_email = current_admin_email`
- Once claimed, three buttons available:
  - **Approve** → opens confirmation modal, requires typing "APPROVE"
    to confirm, optionally notes, then fires the approval transaction
  - **Request revision** → required text area for `reviewer_notes`,
    then sets `status = 'needs_revision'`, sends brand notification email
  - **Reject** → required text area for `reviewer_notes`, then sets
    `status = 'rejected'`, sends brand notification email

### 2. Approval transaction

**File:** `src/lib/submissions/approve-submission.ts` (new)

**Signature:**
```typescript
export async function approveSubmission(
  submissionId: string,
  reviewerEmail: string,
  options?: { reviewerNotes?: string }
): Promise<{ productId: string; scoreRowId: string }>
```

**Transaction steps (all in one Supabase RPC or client-managed transaction):**

1. Read submission. Validate status = 'reviewing'. Validate brand account
   is active. Validate manufacturer_id present.

2. Resolve target product:
   - If `submission.product_id` is set → UPDATE that existing product
     with any corrected fields from submission (name normalization, etc.)
   - Else → INSERT new product from `claimed_brand`, `claimed_product_name`,
     `claimed_sku`, `submission_data.category`, etc. with
     `status = 'active'` and link `manufacturer_id`.

3. Replace ingredients:
   - DELETE all existing `product_ingredients` rows for product_id
   - INSERT ingredients from `submission_data.ingredients` array

4. Replace certifications:
   - For each cert claimed in submission:
     - UPSERT into `certifications` with `onConflict: 'product_id,type'`
     - `verified = true`, `verified_at = NOW()`
     - `verification_url` if provided
     - `certificate_number`, `issued_date`, `expiration_date`
   - Any existing certs not present in submission → leave alone (don't
     delete — they might have been scraper-verified)

5. Trigger rescore:
   - Call `scoreProduct(productId)` with `mode = 'verified'`
   - Insert resulting row into `product_scores` with:
     - `score_mode = 'verified'`
     - `is_current = true`
     - Existing `is_current = true` row for this (product_id, score_mode)
       gets flipped to false (the partial unique index enforces this)
     - `rescore_reason = 'brand_submission_approved'`
     - `scored_by = reviewerEmail`

6. Update submission:
   - `status = 'approved'`
   - `decided_at = NOW()`
   - `reviewer_email = reviewerEmail`
   - `verified_score_applied_at = NOW()`
   - `product_id` set to final target

7. All-or-nothing: wrap in Supabase transaction. If any step fails,
   rollback all. Never partial-apply.

8. Return product id and score row id for caller.

9. Trigger outbound email to brand (Day 5 builds the email templates;
   Day 4 wires the trigger).

### 3. "Needs revision" flow

When admin clicks "Request revision":
- Set `status = 'needs_revision'`
- Set `reviewer_email`
- Set `reviewer_notes`
- Brand's dashboard shows submission with "Respond to reviewer" action
- Clicking action opens the submission editor pre-populated with
  previous values, with reviewer notes displayed prominently
- Brand edits and re-submits → status returns to 'submitted'
- Reviewer sees it back in queue

### 4. "Rejected" flow

When admin clicks "Reject":
- Set `status = 'rejected'`
- Set `reviewer_email`, `reviewer_notes`, `decided_at`
- Brand sees rejection reason in dashboard
- No product created, no score written, no public change
- Brand can start a new submission if they want to try again (not
  a re-open of the rejected one)

### 5. Audit trail

Every state transition writes to a new table:

**Migration:** `YYYYMMDD_submission_history.sql`

```sql
CREATE TABLE public.submission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.product_submissions(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('brand', 'admin', 'system')),
  actor_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_history_submission ON public.submission_history (submission_id, created_at DESC);
ALTER TABLE public.submission_history ENABLE ROW LEVEL SECURITY;
```

Every status change is a row. Forever. Surface in admin UI as timeline.

---

## Deliverables

1. **Patch:** `.agents/patches/submission-day-4-YYYY-MM-DD.patch`
2. **Migration:** `YYYYMMDD_submission_history.sql`
3. **Report:** `.agents/reports/submission-day-4-YYYY-MM-DD.md`:
   - Full happy-path trace: created test submission → claimed → approved
     → scorecard at `/products/[slug]` shows `score_mode = 'verified'`
   - Rejection path trace: submitted → rejected → brand sees reason
   - Revision path trace: submitted → needs_revision → brand edits →
     resubmitted → approved
   - Transaction rollback test: forced a failure midway, verified nothing
     partial committed
   - Screenshot of review detail view

## Success criteria

- Craig can approve a submission in under 5 minutes
- Approval → scorecard update is visible within 30 seconds of approval
- A brand cannot approve their own submission
- An anonymous user cannot approve any submission
- An admin without a valid session cannot approve
- `product_scores.is_current` has exactly one row per `(product_id, score_mode)` after approval
- Submission history captures every state change with actor
- Rolling back a migration or code change does not corrupt already-approved data
