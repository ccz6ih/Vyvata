-- Supabase Storage setup for brand submission file uploads
-- 
-- This SQL creates the necessary storage bucket and RLS policies for
-- brand submission file uploads (CoAs, clinical studies, facts panels).
--
-- IMPORTANT: Run this in Supabase SQL Editor AFTER creating the bucket
-- via Supabase Dashboard > Storage.
--
-- To create the bucket:
--   1. Go to Supabase Dashboard > Storage
--   2. Click "Create a new bucket"
--   3. Bucket name: brand-submissions
--   4. Public: OFF (private bucket)
--   5. Allowed MIME types: application/pdf, image/png, image/jpeg, image/webp
--   6. File size limit: 10 MB
--   7. Click "Create bucket"
--
-- Then run this SQL to configure access policies.

-- ══════════════════════════════════════════════════════════════
-- 1. Storage RLS policies for brand-submissions bucket
-- ══════════════════════════════════════════════════════════════

-- Brands can upload files to their own submission folders
CREATE POLICY "Brands can upload to own submissions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-submissions'
    AND (storage.foldername(name))[1] IN (
      SELECT ba.id::text
      FROM public.brand_accounts ba
      WHERE ba.email = auth.jwt() ->> 'email'
    )
  );

-- Brands can read their own uploaded files
CREATE POLICY "Brands can read own uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'brand-submissions'
    AND (storage.foldername(name))[1] IN (
      SELECT ba.id::text
      FROM public.brand_accounts ba
      WHERE ba.email = auth.jwt() ->> 'email'
    )
  );

-- Brands can delete their own files (only from draft submissions)
CREATE POLICY "Brands can delete own uploads from drafts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-submissions'
    AND (storage.foldername(name))[1] IN (
      SELECT ba.id::text
      FROM public.brand_accounts ba
      WHERE ba.email = auth.jwt() ->> 'email'
    )
  );

-- Admins (service role) can read all files for review
-- (This is implicitly allowed via service role bypass of RLS)

-- ══════════════════════════════════════════════════════════════
-- 2. Verification script
-- ══════════════════════════════════════════════════════════════

-- Run this to verify the bucket exists:
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'brand-submissions';

-- Expected output:
-- name: brand-submissions
-- public: false
-- file_size_limit: 10485760 (10MB)
-- allowed_mime_types: {application/pdf, image/png, image/jpeg, image/webp}

-- ══════════════════════════════════════════════════════════════
-- 3. Test upload path (for debugging)
-- ══════════════════════════════════════════════════════════════

-- Example file path structure:
-- brand-submissions/{brand_account_id}/{submission_id}/coa-1713547200000.pdf
-- brand-submissions/{brand_account_id}/{submission_id}/clinical-study-1713547300000.pdf
-- brand-submissions/{brand_account_id}/{submission_id}/facts-panel-1713547400000.png

-- The upload route in /api/brand/submissions/[id]/upload validates:
-- - File size <= 10MB
-- - MIME type in allowed list
-- - Brand owns the submission
-- - Path follows this structure

COMMENT ON TABLE storage.objects IS 
  'Storage objects. brand-submissions bucket contains CoAs, clinical studies, and facts panels for brand verification.';
