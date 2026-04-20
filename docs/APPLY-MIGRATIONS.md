# Apply Pending Migrations

**Status:** 3 migrations ready to apply to production database  
**Date:** April 19, 2026

---

## Migrations to Apply

### 1. Brand Submission Audit Trail
**File:** `supabase/migrations/20260421_submission_history.sql`  
**Purpose:** Tracks all submission status transitions for compliance  
**Creates:**
- `submission_history` table
- `record_submission_transition()` trigger function
- Automatic logging on INSERT/UPDATE of `product_submissions`

### 2. Commission Agreements
**File:** `supabase/migrations/20260422_commission_agreements.sql`  
**Purpose:** Tracks brand participation in practitioner dispensary program  
**Creates:**
- `commission_agreements` table with rate tiers
- RLS policies for brands/admins
- Link between brands and practitioner channel eligibility

### 3. Dispensary Eligible Products
**File:** `supabase/migrations/20260422_dispensary_eligible_products.sql`  
**Purpose:** Cache of which products qualify for practitioner commissions  
**Creates:**
- `dispensary_eligible_products` table
- `check_dispensary_eligibility()` database function
- RLS policies (public can read eligible products only)

---

## How to Apply

### Option A: Via Supabase Dashboard (Recommended)

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your Vyvata project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Apply Each Migration**
   
   **Migration 1:**
   ```sql
   -- Copy full contents of supabase/migrations/20260421_submission_history.sql
   -- Paste into SQL Editor
   -- Click "Run" (or Ctrl+Enter)
   ```

   **Migration 2:**
   ```sql
   -- Copy full contents of supabase/migrations/20260422_commission_agreements.sql
   -- Paste into SQL Editor
   -- Click "Run"
   ```

   **Migration 3:**
   ```sql
   -- Copy full contents of supabase/migrations/20260422_dispensary_eligible_products.sql
   -- Paste into SQL Editor
   -- Click "Run"
   ```

4. **Verify Success**
   ```sql
   -- Check all tables were created
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN (
       'submission_history',
       'commission_agreements',
       'dispensary_eligible_products'
     )
   ORDER BY table_name;
   
   -- Should return 3 rows
   ```

### Option B: Via Supabase CLI (Advanced)

If you have Supabase CLI installed and linked:

```powershell
# In project root
supabase db push

# Or apply individually
Get-Content supabase/migrations/20260421_submission_history.sql | supabase db execute
Get-Content supabase/migrations/20260422_commission_agreements.sql | supabase db execute
Get-Content supabase/migrations/20260422_dispensary_eligible_products.sql | supabase db execute
```

---

## Post-Migration Setup

### 1. Create Storage Bucket

**Via Supabase Dashboard:**
1. Navigate to **Storage** in left sidebar
2. Click **"New bucket"**
3. **Bucket name:** `brand-submissions`
4. **Public bucket:** ❌ **OFF** (must be private)
5. **File size limit:** 10 MB (recommended)
6. **Allowed MIME types:** Leave empty (validate in app code instead)
7. Click **"Create bucket"**

### 2. Apply Storage RLS Policies

Once bucket is created, run this SQL:

```sql
-- Copy full contents of supabase/storage/brand-submissions-setup.sql
-- Paste into SQL Editor
-- Click "Run"
```

This applies 3 RLS policies:
- Brands can upload to own submission folders
- Brands can read own uploads
- Brands can delete from draft submissions only

### 3. Verify Storage Setup

```sql
-- Check bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'brand-submissions';

-- Check policies were created
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%brand%';
  
-- Should show 3 policies
```

---

## Testing Checklist

After applying migrations:

### ✅ Submission History
```sql
-- 1. Create a test submission (if none exist)
-- 2. Update its status
UPDATE product_submissions 
SET status = 'reviewing', reviewer_email = 'admin@vyvata.com'
WHERE id = '<some-submission-id>';

-- 3. Check history was logged
SELECT * FROM submission_history 
WHERE submission_id = '<some-submission-id>'
ORDER BY created_at DESC;

-- Should show 2 rows: draft→draft (insert), draft→reviewing (update)
```

### ✅ Commission Agreements
```sql
-- 1. Check table exists and is empty
SELECT COUNT(*) FROM commission_agreements;

-- 2. Try creating an agreement via Admin UI:
-- Navigate to /admin/commission-agreements
-- Click "Create Agreement"
-- Fill form and submit

-- 3. Verify in database
SELECT * FROM commission_agreements;
```

### ✅ Dispensary Eligibility
```sql
-- 1. Check table exists
SELECT COUNT(*) FROM dispensary_eligible_products;

-- 2. Manually trigger eligibility check
SELECT check_dispensary_eligibility('<some-product-id>');

-- 3. View results
SELECT 
  p.product_name,
  dep.is_eligible,
  dep.score_at_check,
  dep.fail_reason
FROM dispensary_eligible_products dep
JOIN products p ON dep.product_id = p.id
LIMIT 10;
```

### ✅ Storage Bucket
1. Login as a brand: `/brand/login`
2. Create a new submission: `/brand/submissions/new`
3. Try uploading a file
4. Check Storage > brand-submissions folder in Dashboard
5. Verify file appears with correct path: `{brand_account_id}/{submission_id}/...`

---

## Expected Results

After successful migration:

| Component | Status | What You Should See |
|-----------|--------|---------------------|
| **Submission History** | ✅ | Every submission status change logs to `submission_history` |
| **Commission Agreements** | ✅ | New table + Admin UI at `/admin/commission-agreements` |
| **Dispensary Eligibility** | ✅ | Products auto-checked when approved, admin can manually recalculate |
| **Storage Bucket** | ⏳ | Needs manual creation in Dashboard, then RLS SQL |

---

## Rollback Plan

If something goes wrong:

### Rollback Dispensary Tables
```sql
DROP TABLE IF EXISTS public.dispensary_eligible_products CASCADE;
DROP TABLE IF EXISTS public.commission_agreements CASCADE;
DROP FUNCTION IF EXISTS public.check_dispensary_eligibility(UUID);
```

### Rollback Submission History
```sql
DROP TRIGGER IF EXISTS trg_submission_transition ON public.product_submissions;
DROP FUNCTION IF EXISTS public.record_submission_transition();
DROP TABLE IF EXISTS public.submission_history CASCADE;
```

### Rollback Storage Policies
```sql
-- List all policies first
SELECT policyname FROM pg_policies 
WHERE schemaname = 'storage' AND policyname LIKE '%brand%';

-- Drop them (replace with actual policy names)
DROP POLICY IF EXISTS "Brands can upload to own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Brands can read own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Brands can delete own uploads from drafts" ON storage.objects;

-- Delete bucket (via Dashboard Storage section)
```

---

## Next Steps

Once migrations are applied:

1. ✅ **Test approval flow end-to-end** - Submit → Approve → Check verified score + dispensary eligibility
2. ✅ **Create first commission agreement** - Use Admin UI to enable practitioner channel for a brand
3. ✅ **Test file uploads** - Ensure Storage bucket works for submission attachments
4. 🔄 **Continue P1 Polish** - Dynamic ingredient editor, legal attestation checkbox
5. 🔄 **Phase 2 Dispensary** - Practitioner signup + NPI verification

---

## Support

**If migrations fail:**
- Check error message for constraint violations
- Verify all prerequisite tables exist (`product_submissions`, `products`, `manufacturers`)
- Ensure `brand_accounts.manufacturer_id` foreign key exists
- Check Supabase logs for detailed error traces

**Migration order matters:**
1. submission_history (no dependencies)
2. commission_agreements (depends on manufacturers table)
3. dispensary_eligible_products (depends on products + commission_agreements)
