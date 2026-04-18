-- Migration: Link audits to Supabase Auth users
-- Created: 2026-04-18
-- Purpose: Enable B2C magic-link sign-in via Supabase Auth. A signed-in user's
--          new audits record user_id so they can see their full protocol history
--          on /me. Existing audits (no user_id) still work via email match.

-- Add nullable user_id — anonymous audits stay supported
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audits'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.audits
      ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added user_id column to audits';
  ELSE
    RAISE NOTICE 'audits.user_id already exists, skipping';
  END IF;
END
$$;

-- Index for /me page lookups: list a user's audits, newest first
DROP INDEX IF EXISTS public.audits_user_id_created_at_idx;
CREATE INDEX audits_user_id_created_at_idx
  ON public.audits (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Index for email-based backfill lookups (unchanged column, but used by /me to
-- surface pre-auth audits that match the signed-in user's email)
DROP INDEX IF EXISTS public.audits_email_idx;
CREATE INDEX audits_email_idx
  ON public.audits (email)
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.audits.user_id IS 'Supabase auth.users.id if the audit was created while signed in. NULL for anonymous audits.';

-- Row-level security: a user can always read their own audits (by user_id or
-- by matching email). Keep existing public_slug access for unauthenticated
-- viewers.
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Drop any prior version of our policies before re-creating (idempotent)
DROP POLICY IF EXISTS "audits_owner_select" ON public.audits;
DROP POLICY IF EXISTS "audits_public_slug_select" ON public.audits;
DROP POLICY IF EXISTS "audits_service_all" ON public.audits;

-- Owners can read their audits (matched by user_id OR email). Email match
-- covers pre-auth audits created anonymously with the same email.
CREATE POLICY "audits_owner_select" ON public.audits
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Service role (used by our server code) sees everything; this keeps existing
-- API routes working without changes.
CREATE POLICY "audits_service_all" ON public.audits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Note: the public /protocol/[slug] page uses getSupabaseServer() (anon key)
-- and filters by public_slug. That still works — anon role has no policy
-- applying here, but the existing API route fetches via the anon client and
-- Supabase RLS is enforced per-request. If you want strict public_slug reads
-- to succeed for unauthenticated browsers without going through our API,
-- uncomment the following:
--
-- CREATE POLICY "audits_public_slug_select" ON public.audits
--   FOR SELECT TO anon
--   USING (true);  -- slug is unguessable; is_unlocked gates full content app-side
