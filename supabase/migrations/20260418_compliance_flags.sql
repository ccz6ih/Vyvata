-- Migration: FDA compliance flags
-- Created: 2026-04-18
-- Purpose: Ingest + store US government enforcement data (openFDA recalls,
--          FDA warning letters, CAERS, import alerts) and match to our
--          manufacturers / products. Drives safety score penalty + public
--          product page badges + practitioner alerts. See
--          docs/COMPLIANCE-PIPELINE-PLAN.md for the full plan.

CREATE TABLE IF NOT EXISTS public.compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origin
  source text NOT NULL CHECK (source IN (
    'openfda_recall',
    'fda_warning_letter',
    'caers',
    'import_alert'
  )),
  source_id text NOT NULL,          -- external ID (recall_number, letter URL, etc.)

  -- Summary shown in UI
  subject text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  violation_types text[] NOT NULL DEFAULT '{}',   -- e.g., ['gmp','misbranding']

  -- Preserved full payload from the source API/HTML — source of truth for
  -- future re-matching if our canonicalization changes.
  raw_data jsonb,
  issued_date date,

  -- Matching
  matched_manufacturer_id uuid REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  matched_product_id      uuid REFERENCES public.products(id)      ON DELETE SET NULL,
  match_confidence text NOT NULL DEFAULT 'unmatched' CHECK (match_confidence IN (
    'high', 'medium', 'low', 'unmatched'
  )),
  match_notes text,

  -- Admin dismiss / false-positive path
  resolved_at timestamptz,
  resolved_by text,
  resolved_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source, source_id)
);

-- Indexes for the most common queries
CREATE INDEX IF NOT EXISTS idx_compliance_flags_manufacturer
  ON public.compliance_flags (matched_manufacturer_id)
  WHERE matched_manufacturer_id IS NOT NULL AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_flags_product
  ON public.compliance_flags (matched_product_id)
  WHERE matched_product_id IS NOT NULL AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_flags_confidence_issued
  ON public.compliance_flags (match_confidence, issued_date DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_flags_source_issued
  ON public.compliance_flags (source, issued_date DESC);

COMMENT ON TABLE public.compliance_flags IS 'FDA / openFDA enforcement actions matched to Vyvata manufacturers and products. Drives scoring + public flags.';
COMMENT ON COLUMN public.compliance_flags.source IS 'Which government feed this came from. Determines severity defaults and match strategy.';
COMMENT ON COLUMN public.compliance_flags.source_id IS 'External unique ID from the source (openFDA recall_number, letter URL slug). Used with source for dedup UNIQUE constraint.';
COMMENT ON COLUMN public.compliance_flags.match_confidence IS 'high = exact manufacturer name; medium = unique brand substring; low = ambiguous; unmatched = no hit (needs manual review).';
COMMENT ON COLUMN public.compliance_flags.resolved_at IS 'Admin dismissed as a false positive. The row stays for audit; scoring ignores resolved flags.';
