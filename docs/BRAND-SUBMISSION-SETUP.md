# Brand Submission Portal - Setup Guide

## Overview

The brand submission portal allows supplement manufacturers to submit their product documentation for verified VSF scoring. This doc covers the setup steps needed to complete the portal.

## Current Status

### ✅ Complete
- Database schema (`brand_accounts`, `product_submissions` tables)
- Brand authentication (magic-link via Supabase Auth)
- API routes for submissions (CRUD, submit, upload)
- Form validation schemas
- Frontend pages (login, dashboard, new submission, edit submission)
- Admin review UI (approve/reject/request-revision)

### ⚠️ Needs Setup

#### 1. Supabase Storage Bucket

**What:** File storage for CoA PDFs, clinical studies, audit reports

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `brand-submissions`
3. Set as **Private** (not public)
4. Configure RLS policies:

```sql
-- Allow service role full access
CREATE POLICY service_full_access ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'brand-submissions')
  WITH CHECK (bucket_id = 'brand-submissions');

-- Allow authenticated brands to upload to their own folder
CREATE POLICY brand_upload_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-submissions' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.brand_accounts
      WHERE email = lower(auth.jwt()->>'email')
    )
  );

-- Allow authenticated brands to read their own files
CREATE POLICY brand_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-submissions'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.brand_accounts
      WHERE email = lower(auth.jwt()->>'email')
    )
  );
```

**Test:**
```bash
# Try uploading via the submission form
# Should see files at: brand-submissions/{brand_account_id}/{submission_id}/...
```

#### 2. Rescore Integration

**What:** When admin approves a submission, trigger product rescore to update verified score

**Current:** Approve/reject/request-revision routes exist but don't trigger rescore

**Steps:**
1. Open `src/app/api/admin/submissions/[id]/approve/route.ts`
2. After updating submission status to 'approved', call rescore:

```typescript
// After approval logic
if (submission.product_id) {
  // Trigger rescore for this product
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/products/${submission.product_id}/rescore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VYVATA_ADMIN_SECRET}`,
    },
  });
}
```

#### 3. Email Notifications

**What:** Email brand when submission is approved/rejected/needs-revision

**Current:** Resend already integrated for magic links, just need submission templates

**Steps:**
1. Create email templates in `src/lib/email-templates/`:
   - `submission-approved.ts` - "You're Verified! View your scorecard"
   - `submission-rejected.ts` - "Your submission was not approved"
   - `submission-needs-revision.ts` - "Please update your submission"

2. Update admin API routes to send emails after status change

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

## Usage Flow

1. **Brand signs up:**
   - Go to `/brand/login`
   - Enter company email
   - Click magic link in email
   - Lands on `/brand/dashboard` with `pending` status

2. **Admin approves:**
   - Manually set `status = 'active'` in database (or wait for admin UI)

3. **Brand submits:**
   - Click "New submission" on dashboard
   - Fill 4-section form (Identity, Manufacturing, Clinical, Safety)
   - Upload CoA PDFs
   - Click "Submit for review"

4. **Admin reviews:**
   - Go to `/admin/submissions`
   - See pending submissions
   - Click Approve/Reject/Request Revision
   - Product rescore triggers automatically

5. **Brand sees result:**
   - Approved: Scorecard shows "Verified" tier
   - Rejected: Email with reason
   - Needs revision: Can edit and resubmit

## Testing Checklist

- [ ] Create brand account via magic link
- [ ] Manually activate account in database
- [ ] Create new submission
- [ ] Fill out all 4 form sections
- [ ] Upload a PDF file (test CoA)
- [ ] Submit for review
- [ ] Approve in admin panel
- [ ] Verify product score updated
- [ ] Test reject flow
- [ ] Test request-revision flow

## Notes

- Bucket RLS policies ensure brands can only see their own files
- File upload limited to 10MB, PDF/images only
- Submission data stored as JSONB for flexibility
- Admin review requires `VYVATA_ADMIN_SECRET` or admin session
- First-time login auto-creates `pending` brand account

## Next Steps

1. Setup Storage bucket (5 min)
2. Add rescore trigger (10 min)
3. Create email templates (30 min)
4. Test full flow (30 min)
5. Create admin brand management page (optional, 2 hrs)
