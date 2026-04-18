-- Hotfix: relax audits RLS
-- The previous migration (20260418_add_user_id_to_audits.sql) enabled RLS on
-- audits with policies only for `authenticated` and `service_role`. All our
-- server API routes use the anon key via getSupabaseServer(), so every audit
-- insert/update silently failed with 42501. This migration disables RLS so
-- the existing anon-key server path works again.
--
-- When we later want real row-level enforcement:
-- - Ensure getSupabaseServer() uses SUPABASE_SERVICE_ROLE_KEY (already coded;
--   just needs the env var populated in every deploy environment)
-- - Re-enable RLS and add policies designed around that invariant
-- - OR add explicit `anon` INSERT/UPDATE policies here
--
-- Keeps: user_id column, indexes, the column comment.
-- Drops: RLS policies on the audits table.

DROP POLICY IF EXISTS "audits_owner_select" ON public.audits;
DROP POLICY IF EXISTS "audits_public_slug_select" ON public.audits;
DROP POLICY IF EXISTS "audits_service_all" ON public.audits;

ALTER TABLE public.audits DISABLE ROW LEVEL SECURITY;
