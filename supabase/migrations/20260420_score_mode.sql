-- Migration: Two-path scoring (AI Inferred vs Verified)
-- Created: 2026-04-20
-- Purpose: Enable dual-mode scoring so a single product can have both an
--          AI-inferred score (from public data only, capped) and a Verified
--          score (unlocked when a brand submits documentation).
-- Related: docs/UI-V2-AND-SUBMISSION-PLAN.md §1

-- ══════════════════════════════════════════════════════════════
-- 1. Add score_mode column
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.product_scores
  ADD COLUMN IF NOT EXISTS score_mode TEXT NOT NULL DEFAULT 'ai_inferred'
    CHECK (score_mode IN ('ai_inferred', 'verified'));

COMMENT ON COLUMN public.product_scores.score_mode IS
  'ai_inferred = score derived from public data only (capped at AI_INFERRED_MAX); verified = full-weight score unlocked by approved brand submission.';

-- ══════════════════════════════════════════════════════════════
-- 2. Swap the existing single-current trigger/index for a mode-aware one.
--    Old invariant: one row per product_id where is_current=true.
--    New invariant: one row per (product_id, score_mode) where is_current=true.
-- ══════════════════════════════════════════════════════════════

-- Drop prior unique index if it exists. Name discovered via pg_indexes scan
-- rather than hardcoded — earlier migrations have varied between
-- `uq_product_scores_current` and `product_scores_is_current_idx` depending on
-- when they shipped.
DO $$
DECLARE
  v_idx RECORD;
BEGIN
  FOR v_idx IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'product_scores'
      AND schemaname = 'public'
      AND indexdef ~* 'UNIQUE'
      AND indexdef ~* 'product_id'
      AND indexdef ~* 'is_current'
      AND indexdef !~* 'score_mode'   -- leave new index alone if re-run
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', v_idx.indexname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_scores_current_by_mode
  ON public.product_scores (product_id, score_mode)
  WHERE is_current = true;

-- ══════════════════════════════════════════════════════════════
-- 3. Re-flavour the ensure_single_current_score trigger to scope by mode.
--    If the trigger isn't present (older schemas), skip — the unique index
--    above is the enforcement point.
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'ensure_single_current_score'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.ensure_single_current_score()
    RETURNS TRIGGER AS $trg$
    BEGIN
      IF NEW.is_current THEN
        UPDATE public.product_scores
        SET is_current = false
        WHERE product_id = NEW.product_id
          AND score_mode = NEW.score_mode
          AND id <> NEW.id
          AND is_current = true;
      END IF;
      RETURN NEW;
    END;
    $trg$ LANGUAGE plpgsql;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. Backfill safety — any row without score_mode (shouldn't be possible
--    after the DEFAULT above, but belt + suspenders for re-runs).
-- ══════════════════════════════════════════════════════════════

UPDATE public.product_scores
SET score_mode = 'ai_inferred'
WHERE score_mode IS NULL;
