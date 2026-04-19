# Day 3 — Submission Form + File Upload

**Role:** Full-stack engineer. Build the core submission form where a
brand enters product data and uploads their supplement facts panel.

**Prerequisite:** Day 2 complete. A brand can sign up, verify email,
and land on `/brand/dashboard`. This flow has no submission surface yet.

**Read first:**
- `docs/submission-flow/00-README.md` §Critical non-negotiables
- `docs/submission-flow/01-audit.md`
- `docs/submission-flow/02-public-submit.md`
- The existing `/brand/dashboard/page.tsx` — the form will live
  adjacent to it

---

## Scope

### 1. Brand dashboard updates (`/brand/dashboard`)

Extend the existing dashboard to show:
- "Your submissions" table — queries `product_submissions WHERE brand_account_id = current_brand.id`
- Columns: Product name, status (Draft / Submitted / Reviewing / Approved / Needs Revision / Rejected), last updated, action
- Status-specific actions:
  - Draft → "Continue editing" → `/brand/submissions/[id]/edit`
  - Submitted → "View submission" (read-only)
  - Reviewing → "View submission" (read-only) with note "A reviewer is assessing this submission"
  - Approved → "View public scorecard" → `/products/[slug]`
  - Needs Revision → "Respond to reviewer" → editor with reviewer_notes shown
  - Rejected → "View reason" → read-only with `reviewer_notes`
- Primary CTA: "Submit a new product" → `/brand/submissions/new`

### 2. New submission form (`/brand/submissions/new`)

**Architecture:** multi-step form with per-step save-as-draft. Brand
can close browser mid-form and resume — saves every step to
`product_submissions` with `status = 'draft'`.

**Steps:**

**Step 1 — Product identity:**
- Product name (required)
- SKU / UPC (optional but strongly encouraged)
- Category (dropdown matching existing `products.category` values)
- Manufacturer name — autofilled from `brand_accounts.company_name`,
  read-only unless contact is different from manufacturer
- Manufacturer country (optional)
- Product URL on brand's own website (optional but encouraged)
- If this product already exists in Vyvata's DB (brand + name fuzzy
  match), surface that: "We already track this product. Submitting
  verification will upgrade its score from AI Inferred to Verified."

**Step 2 — Supplement facts:**
- Serving size (required, text — e.g., "2 capsules")
- Servings per container (required, number)
- Ingredients table (dynamic add/remove rows):
  - Ingredient name (required)
  - Dose (required, number)
  - Unit (required, dropdown: mg/mcg/g/IU/billion CFU/other)
  - Form (optional — e.g., "citrate", "methylcobalamin")
  - Is proprietary blend (checkbox)
  - Daily Value % (optional)
- "Add ingredient" button to add rows dynamically

**Step 3 — Certifications:**
- Checkboxes for the cert types in the existing `certifications.type`
  enum (nsf_sport, nsf_gmp, usp_verified, informed_sport, non_gmo,
  organic_usda, vegan, etc.)
- For each checked cert, require:
  - Certificate number
  - Issued date
  - Expiration date
  - Upload field for the certificate PDF/image
  - Verification URL (if public)

**Step 4 — Supporting documents:**
- Required: Supplement facts panel (PDF or image, max 10MB)
- Required: Certificate of Analysis (CoA) if making potency claims
- Optional: Third-party testing reports
- Optional: Manufacturing facility info (GMP certificate, FDA registration)
- Upload to Supabase Storage bucket `brand-submissions` (private, signed
  URLs only)

**Step 5 — Review & submit:**
- Read-only summary of all entered data
- Legal attestation checkbox: "I attest that the data and documents
  submitted are accurate, current, and represent this product as
  currently manufactured. I understand Vyvata will review this
  submission before applying a Verified score."
- Final submit button

### 3. Supabase Storage setup

**Migration:** `supabase/migrations/YYYYMMDD_brand_submissions_storage.sql`

Create storage bucket `brand-submissions`:
- Private (no public access)
- Service role read (for admin review)
- Authenticated brand can insert into paths prefixed with their
  `brand_account_id/`
- Brand can read their own uploads only
- Max file size: 10MB per file
- Accepted MIME types: application/pdf, image/png, image/jpeg, image/webp

File references stored in `product_submissions.file_references` as
jsonb array:
```json
[
  {
    "type": "facts_panel",
    "filename": "facts-panel-magnesium-bisglycinate.pdf",
    "storage_path": "brand-submissions/{brand_id}/submissions/{submission_id}/facts-panel.pdf",
    "uploaded_at": "2026-04-19T..."
  },
  {
    "type": "certificate_nsf_sport",
    "filename": "nsf-cert-12345.pdf",
    "storage_path": "brand-submissions/{brand_id}/submissions/{submission_id}/nsf-cert.pdf",
    "uploaded_at": "2026-04-19T..."
  }
]
```

### 4. Server actions

**File:** `src/app/brand/submissions/actions.ts` (new)

- `saveDraft(submissionId, data)` — upsert submission with status=draft
- `uploadFile(submissionId, type, file)` — signed URL + storage insert
- `submitForReview(submissionId)` — validate all required fields,
  change status to 'submitted', set `submitted_at = NOW()`, send
  admin notification email, send brand confirmation email
- `listMySubmissions()` — query for dashboard

Every action must verify the current brand session owns the submission.
Never trust a client-provided `brand_account_id`.

### 5. State machine rules

Valid transitions (enforce server-side):
- `null → draft` on create
- `draft → draft` on edit
- `draft → submitted` on review-request
- `submitted → reviewing` (admin only, Day 4)
- `submitted → needs_revision → draft` (admin only, Day 4)
- `reviewing → approved` (admin only, Day 4)
- `reviewing → rejected` (admin only, Day 4)

Brand can only transition draft→submitted. All other state transitions
are admin-only and covered in Day 4.

---

## Deliverables

1. **Patch:** `.agents/patches/submission-day-3-YYYY-MM-DD.patch`
2. **Migrations:**
   - `YYYYMMDD_brand_submissions_storage.sql` (storage bucket)
3. **Report:** `.agents/reports/submission-day-3-YYYY-MM-DD.md`:
   - Screenshots of each of the 5 form steps
   - Test trace: test brand account submitted a complete fake product,
     admin-side query confirms row landed with all file refs
   - RLS policy verification: second brand cannot see first brand's
     submissions or files
   - Dashboard shows submissions correctly with status-specific actions

## Success criteria

- Brand can complete a full submission end-to-end
- Drafts persist across sessions (close browser, come back, resume)
- File uploads land in private Storage bucket
- Second brand cannot access first brand's submission or files
- Admin can query the submission from `admin/submissions` (Day 4 builds
  the UI for this)
- No submission data appears anywhere on public `/products/*`
- Submission in `draft` or `submitted` state has NO effect on any
  `product_scores` row
