-- Migration: Brand Submission Portal (Phase 3 foundation)
-- Created: 2026-04-20
-- Purpose: Let brands claim their products and submit documentation to
--          unlock the verified-mode score. Two tables: brand_accounts
--          (one row per company, keyed on email) and product_submissions
--          (the form + file references + review lifecycle).
-- Auth:    We don't roll a third auth system. Brands log in via the
--          existing Supabase Auth magic-link flow. brand_accounts is a
--          sidecar table keyed on the auth user's email, so "who you are
--          logged in as" is Supabase Auth, and "what brand you represent"
--          is brand_accounts.
-- Related: docs/UI-V2-AND-SUBMISSION-PLAN.md §4

-- ══════════════════════════════════════════════════════════════
-- 1. brand_accounts
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.brand_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The canonical user email. Matches auth.users.email once the user
  -- authenticates via magic-link.
  email TEXT NOT NULL UNIQUE,

  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_role TEXT,

  -- Link to manufacturers table when resolvable. Optional — a brand might
  -- sign up before we've ingested any of their products.
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,

  -- Admin-controlled lifecycle. 'pending' = just signed up, not yet
  -- vetted. 'active' = approved, can create submissions. 'suspended' =
  -- abusive/revoked.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),

  -- Verification status mirrored from Supabase Auth for easy filtering.
  email_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_accounts_email ON public.brand_accounts (email);
CREATE INDEX IF NOT EXISTS idx_brand_accounts_manufacturer ON public.brand_accounts (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_brand_accounts_status ON public.brand_accounts (status, created_at DESC);

COMMENT ON TABLE public.brand_accounts IS
  'One row per company that has signed up to the brand submission portal. Keyed on email; auth identity lives in auth.users.';
COMMENT ON COLUMN public.brand_accounts.status IS
  'pending (just signed up), active (admin approved, can submit), suspended (revoked).';

-- ══════════════════════════════════════════════════════════════
-- 2. product_submissions
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id UUID NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,

  -- Once matched, the submission is linked to a real product. Prior to
  -- that (e.g. brand submitted a product that doesn't exist in Vyvata's
  -- catalog yet) this is NULL and the claimed_* fields carry the data.
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

  claimed_brand TEXT,
  claimed_product_name TEXT,
  claimed_sku TEXT,

  -- All of the form payload as JSONB. See
  -- docs/UI-V2-AND-SUBMISSION-PLAN.md §4.4 for the Zod schema that
  -- governs this shape.
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Files uploaded to Supabase Storage (bucket: brand-submissions).
  -- Shape: [{ kind, path, size, uploaded_at }]. The file binary lives
  -- in Storage; this is the index.
  file_references JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Review lifecycle.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'reviewing', 'approved', 'rejected', 'needs_revision')),
  submitted_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  reviewer_email TEXT,
  reviewer_notes TEXT,

  -- Timestamp of when the approved submission's data was applied to the
  -- product_scores verified row. NULL until rescore runs successfully.
  verified_score_applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_brand ON public.product_submissions (brand_account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_product ON public.product_submissions (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.product_submissions (status, submitted_at DESC NULLS LAST);

COMMENT ON TABLE public.product_submissions IS
  'Brand-submitted documentation for product verification. Moves through draft -> submitted -> reviewing -> approved/rejected/needs_revision. Approved submissions unlock the verified-mode score.';

-- ══════════════════════════════════════════════════════════════
-- 3. updated_at triggers
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at_brand_portal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brand_accounts_updated ON public.brand_accounts;
CREATE TRIGGER trg_brand_accounts_updated
  BEFORE UPDATE ON public.brand_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_brand_portal();

DROP TRIGGER IF EXISTS trg_product_submissions_updated ON public.product_submissions;
CREATE TRIGGER trg_product_submissions_updated
  BEFORE UPDATE ON public.product_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_brand_portal();

-- ══════════════════════════════════════════════════════════════
-- 4. RLS. Service role bypasses everything (our server-side code uses
--    service role); anon gets no direct read access. Brand users read
--    their own row via app-level checks (we look up brand_accounts by
--    auth.jwt()->>'email').
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.brand_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_accounts_service ON public.brand_accounts;
CREATE POLICY brand_accounts_service ON public.brand_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS submissions_service ON public.product_submissions;
CREATE POLICY submissions_service ON public.product_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Let an authenticated brand read their own brand_accounts row. Useful
-- for client-side hydration without a roundtrip through server code.
DROP POLICY IF EXISTS brand_accounts_self_read ON public.brand_accounts;
CREATE POLICY brand_accounts_self_read ON public.brand_accounts
  FOR SELECT TO authenticated
  USING (email = lower(auth.jwt()->>'email'));

-- Brand users can see their own submissions.
DROP POLICY IF EXISTS submissions_self_read ON public.product_submissions;
CREATE POLICY submissions_self_read ON public.product_submissions
  FOR SELECT TO authenticated
  USING (
    brand_account_id IN (
      SELECT id FROM public.brand_accounts
      WHERE email = lower(auth.jwt()->>'email')
    )
  );
