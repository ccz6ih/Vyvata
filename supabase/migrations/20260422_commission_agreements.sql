-- Migration: Commission Agreements (Practitioner Dispensary Phase 1)
-- Created: 2026-04-22
-- Purpose: Enable brands to opt into the practitioner dispensary program
--          with negotiated commission rates. This is the foundation for
--          the practitioner channel - products with verified scores >= 75
--          AND active commission agreements become eligible for practitioner
--          commissions.
-- Related: docs/practitioner-dispensary-program.md §7 Step 1
--          docs/submission-to-dispensary-roadmap.md Phase 1

-- ══════════════════════════════════════════════════════════════
-- 1. commission_agreements
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to manufacturer (brands in the product catalog)
  -- NOTE: brand_accounts.manufacturer_id -> manufacturers.id
  --       commission agreements are per manufacturer, not per brand_account
  manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE CASCADE,
  
  -- Commission rate structure (from dispensary spec §4)
  -- Consumer: 8-12%, Practitioner: 18-20%, Elite: 22-25%
  consumer_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 
    CHECK (consumer_rate >= 8.00 AND consumer_rate <= 12.00),
  practitioner_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00 
    CHECK (practitioner_rate >= 18.00 AND practitioner_rate <= 20.00),
  elite_rate DECIMAL(5,2) NOT NULL DEFAULT 23.50 
    CHECK (elite_rate >= 22.00 AND elite_rate <= 25.00),
  
  -- Agreement lifecycle
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'terminated')),
  
  -- Dispensary opt-in (from spec §2A "Practitioner Channel Opt-In")
  -- Some brands may choose not to participate even with an agreement
  practitioner_channel_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit trail
  created_by TEXT, -- Admin email who created the agreement
  notes TEXT, -- Internal notes (e.g., "Negotiated higher rate due to premium brand")
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commission_agreements_manufacturer 
  ON public.commission_agreements(manufacturer_id);
CREATE INDEX idx_commission_agreements_status 
  ON public.commission_agreements(status, practitioner_channel_enabled);
CREATE INDEX idx_commission_agreements_effective 
  ON public.commission_agreements(effective_date, termination_date);

-- Ensure only one active agreement per manufacturer at a time
CREATE UNIQUE INDEX idx_commission_agreements_active_per_manufacturer 
  ON public.commission_agreements(manufacturer_id) 
  WHERE status = 'active';

COMMENT ON TABLE public.commission_agreements IS
  'Brand-level commission rate configuration for the practitioner dispensary program. One active agreement per manufacturer.';
COMMENT ON COLUMN public.commission_agreements.practitioner_channel_enabled IS
  'Brands must opt-in to the practitioner channel. False = agreement exists but dispensary disabled.';
COMMENT ON COLUMN public.commission_agreements.consumer_rate IS
  'Standard consumer affiliate rate (8-12%). Vyvata retains this when consumers purchase directly.';
COMMENT ON COLUMN public.commission_agreements.practitioner_rate IS
  'Standard practitioner commission rate (18-20%). Practitioners earn this, Vyvata takes spread (~7%).';
COMMENT ON COLUMN public.commission_agreements.elite_rate IS
  'Elite practitioner commission rate (22-25%). For high-volume practitioners, Vyvata spread (~5%).';

-- ══════════════════════════════════════════════════════════════
-- 2. Updated_at trigger
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at_commission_agreements()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_agreements_updated ON public.commission_agreements;
CREATE TRIGGER trg_commission_agreements_updated
  BEFORE UPDATE ON public.commission_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_commission_agreements();

-- ══════════════════════════════════════════════════════════════
-- 3. RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.commission_agreements ENABLE ROW LEVEL SECURITY;

-- Service role has full access (our server-side admin code)
DROP POLICY IF EXISTS commission_agreements_service ON public.commission_agreements;
CREATE POLICY commission_agreements_service ON public.commission_agreements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Brands can read their own commission agreement (if linked to a manufacturer)
-- This enables brands to see if they're enrolled in the dispensary program
DROP POLICY IF EXISTS commission_agreements_brand_read ON public.commission_agreements;
CREATE POLICY commission_agreements_brand_read ON public.commission_agreements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_accounts
      WHERE brand_accounts.manufacturer_id = commission_agreements.manufacturer_id
        AND brand_accounts.email = lower(auth.jwt()->>'email')
    )
  );

-- Public can check if a manufacturer has an active agreement (needed for frontend)
-- This is safe - we only expose the existence of an agreement, not the rates
DROP POLICY IF EXISTS commission_agreements_public_check ON public.commission_agreements;
CREATE POLICY commission_agreements_public_check ON public.commission_agreements
  FOR SELECT TO anon
  USING (status = 'active' AND practitioner_channel_enabled = true);
