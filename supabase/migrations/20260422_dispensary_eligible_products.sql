-- Migration: Dispensary Eligible Products (Practitioner Dispensary Phase 1)
-- Created: 2026-04-22
-- Purpose: Materialized cache of products eligible for the practitioner
--          dispensary channel. A product qualifies if it has a verified
--          score >= 75 AND its manufacturer has an active commission
--          agreement with practitioner_channel_enabled = true.
-- Related: docs/practitioner-dispensary-program.md §7 Step 1
--          docs/submission-to-dispensary-roadmap.md Phase 1

-- ══════════════════════════════════════════════════════════════
-- 1. dispensary_eligible_products
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dispensary_eligible_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product reference (one row per product)
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Eligibility status
  is_eligible BOOLEAN NOT NULL DEFAULT false,
  
  -- Snapshot data from last eligibility check
  eligibility_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_at_check DECIMAL(5,2), -- Verified integrity score at time of check
  
  -- Failure reason if not eligible (from spec §2A)
  fail_reason TEXT CHECK (fail_reason IN (
    'no_verified_score',           -- No verified score exists
    'score_below_threshold',       -- Verified score < 75
    'no_commission_agreement',     -- Manufacturer has no agreement
    'channel_disabled',            -- Agreement exists but practitioner_channel_enabled = false
    'agreement_not_active',        -- Agreement status != 'active'
    'compliance_flag_active'       -- Product/manufacturer has active auto-fail flags
  )),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispensary_eligible_product 
  ON public.dispensary_eligible_products(product_id);
CREATE INDEX idx_dispensary_eligible_status 
  ON public.dispensary_eligible_products(is_eligible) 
  WHERE is_eligible = true;
CREATE INDEX idx_dispensary_eligible_checked 
  ON public.dispensary_eligible_products(eligibility_checked_at DESC);

COMMENT ON TABLE public.dispensary_eligible_products IS
  'Materialized cache of products eligible for practitioner commission earnings. Re-evaluated on every score change and commission agreement change.';
COMMENT ON COLUMN public.dispensary_eligible_products.is_eligible IS
  'TRUE if product currently qualifies for dispensary: verified score >= 75 AND manufacturer has active agreement with channel enabled.';
COMMENT ON COLUMN public.dispensary_eligible_products.fail_reason IS
  'If not eligible, this explains why. Used for admin debugging and brand communication.';
COMMENT ON COLUMN public.dispensary_eligible_products.score_at_check IS
  'Snapshot of the verified integrity_score at time of last check. Used to detect score threshold crossings.';

-- ══════════════════════════════════════════════════════════════
-- 2. Updated_at trigger
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at_dispensary_eligible()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispensary_eligible_updated ON public.dispensary_eligible_products;
CREATE TRIGGER trg_dispensary_eligible_updated
  BEFORE UPDATE ON public.dispensary_eligible_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_dispensary_eligible();

-- ══════════════════════════════════════════════════════════════
-- 3. RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.dispensary_eligible_products ENABLE ROW LEVEL SECURITY;

-- Service role has full access (eligibility checks run server-side)
DROP POLICY IF EXISTS dispensary_eligible_service ON public.dispensary_eligible_products;
CREATE POLICY dispensary_eligible_service ON public.dispensary_eligible_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read ONLY eligible products (practitioners/consumers see which products are in program)
-- This is critical: fail_reason and other internal data is NOT exposed
DROP POLICY IF EXISTS dispensary_eligible_public_read ON public.dispensary_eligible_products;
CREATE POLICY dispensary_eligible_public_read ON public.dispensary_eligible_products
  FOR SELECT TO anon, authenticated
  USING (is_eligible = true);

-- Brands can see eligibility status for their own products (including fail_reason)
DROP POLICY IF EXISTS dispensary_eligible_brand_read ON public.dispensary_eligible_products;
CREATE POLICY dispensary_eligible_brand_read ON public.dispensary_eligible_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.brand_accounts ba ON ba.manufacturer_id = p.manufacturer_id
      WHERE p.id = dispensary_eligible_products.product_id
        AND ba.email = lower(auth.jwt()->>'email')
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 4. Helper function: Check eligibility for a product
-- ══════════════════════════════════════════════════════════════
-- This function encapsulates the eligibility logic from the spec §2A
-- Called by: approval transaction, score recalculation, commission agreement changes

CREATE OR REPLACE FUNCTION public.check_dispensary_eligibility(p_product_id UUID)
RETURNS TABLE (
  is_eligible BOOLEAN,
  fail_reason TEXT,
  score_at_check DECIMAL(5,2)
) AS $$
DECLARE
  v_product_record RECORD;
  v_score_record RECORD;
  v_agreement_record RECORD;
  v_compliance_count INT;
BEGIN
  -- Step 1: Get product and manufacturer
  SELECT p.id, p.manufacturer_id
  INTO v_product_record
  FROM public.products p
  WHERE p.id = p_product_id;
  
  IF NOT FOUND OR v_product_record.manufacturer_id IS NULL THEN
    RETURN QUERY SELECT false, 'no_manufacturer'::TEXT, NULL::DECIMAL(5,2);
    RETURN;
  END IF;
  
  -- Step 2: Get current verified score
  SELECT ps.integrity_score, ps.tier
  INTO v_score_record
  FROM public.product_scores ps
  WHERE ps.product_id = p_product_id
    AND ps.score_mode = 'verified'
    AND ps.is_current = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_verified_score'::TEXT, NULL::DECIMAL(5,2);
    RETURN;
  END IF;
  
  -- Step 3: Check score threshold (spec §2A: minimum 75+)
  IF v_score_record.integrity_score < 75 THEN
    RETURN QUERY SELECT false, 'score_below_threshold'::TEXT, v_score_record.integrity_score;
    RETURN;
  END IF;
  
  -- Step 4: Check for active auto-fail compliance flags (spec §2A: "No Active Auto-Fail Conditions")
  SELECT COUNT(*)
  INTO v_compliance_count
  FROM public.compliance_flags cf
  WHERE cf.status = 'open'
    AND cf.severity IN ('critical', 'high')
    AND (cf.product_id = p_product_id OR cf.manufacturer_id = v_product_record.manufacturer_id);
  
  IF v_compliance_count > 0 THEN
    RETURN QUERY SELECT false, 'compliance_flag_active'::TEXT, v_score_record.integrity_score;
    RETURN;
  END IF;
  
  -- Step 5: Check commission agreement exists
  SELECT ca.id, ca.status, ca.practitioner_channel_enabled
  INTO v_agreement_record
  FROM public.commission_agreements ca
  WHERE ca.manufacturer_id = v_product_record.manufacturer_id
    AND ca.status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_commission_agreement'::TEXT, v_score_record.integrity_score;
    RETURN;
  END IF;
  
  IF v_agreement_record.status != 'active' THEN
    RETURN QUERY SELECT false, 'agreement_not_active'::TEXT, v_score_record.integrity_score;
    RETURN;
  END IF;
  
  -- Step 6: Check practitioner channel is enabled
  IF NOT v_agreement_record.practitioner_channel_enabled THEN
    RETURN QUERY SELECT false, 'channel_disabled'::TEXT, v_score_record.integrity_score;
    RETURN;
  END IF;
  
  -- All checks passed!
  RETURN QUERY SELECT true, NULL::TEXT, v_score_record.integrity_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_dispensary_eligibility IS
  'Evaluates whether a product meets all criteria for practitioner dispensary eligibility per spec §2A. Returns (is_eligible, fail_reason, score_at_check).';
