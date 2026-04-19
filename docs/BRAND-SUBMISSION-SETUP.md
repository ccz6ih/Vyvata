# Brand Submission Portal - Setup Guide

## Overview

The brand submission portal allows supplement manufacturers to submit their product documentation for verified VSF scoring. This doc covers the final setup steps to launch the portal.

## Current Status (Updated 2026-04-21)

### ✅ Complete
- Database schema (`brand_accounts`, `product_submissions`, `submission_history` tables)
- Brand authentication (magic-link via Supabase Auth)
- API routes for submissions (CRUD, submit, upload)
- Form validation schemas
- Frontend pages (login, dashboard, new submission, edit submission)
- Admin review UI (approve/reject/request-revision)
- **Approval transaction** (`approveSubmission()`) - transfers submission data to products, ingredients, certifications, and triggers verified scoring
- **Audit trail** - `submission_history` table tracks all state transitions
- **Verified scoring** - Approved submissions get `score_mode='verified'` rows in `product_scores`

### ⚠️ Needs Setup

#### 1. Apply Database Migration

**What:** The `submission_history` audit trail table

**Steps:**
```bash
# Run the migration in Supabase Dashboard > SQL Editor
# File: supabase/migrations/20260421_submission_history.sql
```

This creates:
- `submission_history` table for audit trail
- Automatic trigger to log all status transitions
- RLS policies for brand/admin access

#### 2. Supabase Storage Bucket

**What:** File storage for CoA PDFs, clinical studies, supplement facts panels

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Bucket name: `brand-submissions`
4. Public: **OFF** (private bucket)
5. Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`
6. File size limit: 10 MB
7. Click "Create bucket"
8. Run the setup SQL: `supabase/storage/brand-submissions-setup.sql`

**Or use the Supabase CLI:**
```bash
# If you have Supabase CLI installed
supabase storage create brand-submissions --no-public
```

Then apply RLS policies from `supabase/storage/brand-submissions-setup.sql` in SQL Editor.

**Test:**
```bash
# Try uploading via the submission form at /brand/submissions/[id]
# Should see files at: brand-submissions/{brand_account_id}/{submission_id}/coa-*.pdf
```

#### 3. Email Notifications (Optional - P2)

**What:** Email brand when submission is approved/rejected/needs-revision

**Current:** Resend already integrated for magic links, but submission notification templates not yet created

**Priority:** P2 (Nice to have - submission flow works without emails, brands see status in dashboard)

**Steps (when ready):**
1. Create email templates in `src/lib/emails/brand/`:
   - `submission-approved.tsx` - "Product Verified! View your scorecard"
   - `submission-rejected.tsx` - "Submission not approved"
   - `submission-needs-revision.tsx` - "Please update your submission"

2. Wire emails into approval transaction (`approveSubmission()` in `src/lib/submissions/approve-submission.ts`)

#### 4. Admin Accounts Setup

**What:** Approve initial brand accounts so they can submit

**Steps:**
1. Brand signs up → creates `pending` account
2. Admin reviews in `/admin/submissions` (or create dedicated brand approval page)
3. Update account status:

```sql
UPDATE brand_accounts 
SET status = 'active' 
WHERE email = 'hello@supplement-brand.com';
```

**Future:** Create `/admin/brands` page for account management

## Usage Flow (End-to-End)

1. **Brand signs up:**
   - Go to `/brand/login`
   - Enter company email
   - Click magic link in email
   - Lands on `/brand/dashboard` with `pending` status

2. **Admin activates brand account:**
   - Manually set `status = 'active'` in database:
   ```sql
   UPDATE brand_accounts 
   SET status = 'active', manufacturer_id = 'existing-manufacturer-id'
   WHERE email = 'hello@supplement-brand.com';
   ```
   - **Important:** Must link to a manufacturer for approval to work

3. **Brand creates submission:**
   - Click "New submission" on dashboard
   - Fill 4-section form (Identity, Manufacturing, Clinical, Safety)
   - Upload supporting documents (CoA PDFs, clinical studies)
   - Click "Submit for review"
   - Status changes to `submitted`

4. **Admin reviews and approves:**
   - Go to `/admin/submissions`
   - See pending submissions in queue
   - Click submission to review details
   - Click "Approve" button
   - **Approval transaction executes:**
     - Creates or updates product in catalog
     - Replaces product ingredients from submission data
     - Upserts certifications (NSF, USP, etc.)
     - Triggers verified scoring (`score_mode='verified'`)
     - Updates submission status to `approved`
     - Logs audit trail to `submission_history`

5. **Brand sees result:**
   - Dashboard shows "Approved" status
   - Public scorecard at `/products/[slug]` shows "Verified" tier with updated score
   - Can submit more products

6. **Alternative flows:**
   - **Reject:** Admin adds notes, brand sees rejection reason
   - **Request revision:** Brand receives feedback, can edit and resubmit

## What Happens on Approval

The `approveSubmission()` transaction performs these steps atomically:

1. ✅ Validates submission is in `reviewing` status
2. ✅ Validates brand account is `active` and linked to manufacturer
3. ✅ Creates new product OR updates existing product
4. ✅ Deletes old ingredients, inserts new ones from submission
5. ✅ Upserts certifications (NSF Sport, USP Verified, etc.)
6. ✅ Loads fresh product data
7. ✅ Runs `scoreProduct()` with verified mode
8. ✅ Marks old verified score as `is_current=false`
9. ✅ Inserts new verified score with `score_mode='verified'`
10. ✅ Updates submission status to `approved` with timestamps
11. ✅ Logs to `submission_history` (via trigger)

**All-or-nothing:** If any step fails, the entire transaction rolls back.

## Testing Checklist

**Pre-flight:**
- [ ] Apply migration: `20260421_submission_history.sql`
- [ ] Create Storage bucket: `brand-submissions`
- [ ] Apply Storage RLS policies from `supabase/storage/brand-submissions-setup.sql`

**Happy path test:**
- [ ] Create brand account via magic link at `/brand/login`
- [ ] Manually activate account + link to manufacturer in DB
- [ ] Create new submission at `/brand/submissions/new`
- [ ] Fill all 4 form sections with real data
- [ ] Upload a PDF file (test CoA or facts panel)
- [ ] Save draft → verify can reload and continue
- [ ] Submit for review → status changes to `submitted`
- [ ] Go to `/admin/submissions` → see submission in queue
- [ ] Click "Approve" → verify success response
- [ ] Check `product_scores` table → should have new `score_mode='verified'` row
- [ ] Check submission → status should be `approved`
- [ ] Check `submission_history` → should have audit trail
- [ ] Visit product scorecard → should show "Verified" tier

**Rejection flow:**
- [ ] Submit another test submission
- [ ] Admin clicks "Reject" with notes
- [ ] Brand sees rejection reason in dashboard
- [ ] Verify nothing changed in `products` or `product_scores`

**Revision flow:**
- [ ] Submit third test submission
- [ ] Admin clicks "Request Revision" with feedback
- [ ] Brand sees status `needs_revision` with reviewer notes
- [ ] Brand edits submission and resubmits
- [ ] Admin approves → verify score updates

**Security tests:**
- [ ] Try approving without admin session → 401
- [ ] Try approving submission with `pending` brand account → error
- [ ] Try approving submission not in `reviewing` status → error
- [ ] Brand A tries to access Brand B's submission → 403
- [ ] Brand tries to upload to another brand's folder → blocked by RLS

## Current Limitations & Future Work

**Missing (from full sprint spec):**
- Public `/submit` landing page (brands need direct link to `/brand/login`)
- Email verification for new brands (currently auto-creates on first magic link)
- Email notifications on status changes (brands check dashboard for updates)
- Dynamic ingredient editor (placeholder shows "coming soon")
- Cross-site CTAs (methodology page doesn't link to submission flow)
- Legal attestation checkbox (field exists in schema but not UI)
- 5th form step for supplement facts panel (current form has 4 sections)

**What works today:**
- ✅ Brand auth via magic link
- ✅ Multi-step submission form
- ✅ File upload infrastructure (needs bucket created)
- ✅ Admin review queue
- ✅ **Full approval transaction** (creates/updates product, ingredients, certs, scores)
- ✅ Verified scoring integration
- ✅ Audit trail
- ✅ State machine enforcement
- ✅ RLS security policies

## Next Steps

**Immediate (to launch):**
1. Apply `submission_history` migration
2. Create Storage bucket with RLS policies
3. Test end-to-end approval flow
4. Activate first real brand account

**Short-term (P1):**
1. Fix ingredient editor (dynamic add/remove rows)
2. Add legal attestation checkbox before submit
3. Email templates for approved/rejected/needs-revision

**Medium-term (P2):**
1. Public `/submit` landing page
2. Cross-site CTAs (methodology page, unscored scorecards)
3. Brand outreach playbook for Craig
4. Admin brand management UI

**Long-term (out of scope for MVP):**
1. Multi-user brand accounts
2. Bulk CSV upload
3. Automated OCR for supplement facts panels
4. Shopify Collective integration

## Support

- Database issues: Check Supabase logs and RLS policies
- Upload issues: Verify bucket exists and RLS policies applied
- Approval failures: Check server logs for transaction error details
- Score not updating: Verify manufacturer_id is set on brand_account
