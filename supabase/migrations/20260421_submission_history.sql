-- Migration: Brand submission audit trail
-- Created: 2026-04-21
-- Purpose: Track every status transition of product_submissions for compliance
--          and debugging. Every approve/reject/revision/resubmit action writes
--          a row here with who did it, when, and why.

-- ══════════════════════════════════════════════════════════════
-- 1. submission_history table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.submission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.product_submissions(id) ON DELETE CASCADE,
  
  -- State transition
  from_status TEXT, -- NULL for initial draft creation
  to_status TEXT NOT NULL,
  
  -- Who triggered the transition
  actor_type TEXT NOT NULL CHECK (actor_type IN ('brand', 'admin', 'system')),
  actor_email TEXT, -- brand email or admin email; NULL for system triggers
  
  -- Why (optional but encouraged for admin actions)
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. Indexes
-- ══════════════════════════════════════════════════════════════

CREATE INDEX idx_submission_history_submission 
  ON public.submission_history (submission_id, created_at DESC);

CREATE INDEX idx_submission_history_actor 
  ON public.submission_history (actor_email, created_at DESC)
  WHERE actor_email IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- 3. RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.submission_history ENABLE ROW LEVEL SECURITY;

-- Brands can view history for their own submissions
CREATE POLICY "Brands can view own submission history"
  ON public.submission_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_submissions ps
      INNER JOIN public.brand_accounts ba ON ps.brand_account_id = ba.id
      WHERE ps.id = submission_history.submission_id
        AND ba.email = auth.jwt() ->> 'email'
    )
  );

-- Admins can view all history
-- (Admin policy will be added when admin auth is formalized;
--  for now service role has full access)

-- Service role can write history
CREATE POLICY "Service role can write history"
  ON public.submission_history FOR INSERT
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- 4. Helper function to record state transitions
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_submission_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status actually changes (or on initial insert)
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.submission_history (
      submission_id,
      from_status,
      to_status,
      actor_type,
      actor_email,
      notes
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      -- Infer actor type from context
      CASE
        WHEN NEW.status IN ('submitted', 'needs_revision') AND NEW.reviewer_email IS NULL THEN 'brand'
        WHEN NEW.status IN ('approved', 'rejected', 'needs_revision', 'reviewing') THEN 'admin'
        ELSE 'system'
      END,
      -- Capture the email if available
      COALESCE(
        NEW.reviewer_email,
        auth.jwt() ->> 'email'
      ),
      NEW.reviewer_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════
-- 5. Trigger to auto-log all transitions
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_submission_transition ON public.product_submissions;

CREATE TRIGGER trg_submission_transition
  AFTER INSERT OR UPDATE ON public.product_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_submission_transition();

-- ══════════════════════════════════════════════════════════════
-- 6. Comments for documentation
-- ══════════════════════════════════════════════════════════════

COMMENT ON TABLE public.submission_history IS 
  'Audit trail for all brand submission status transitions. Every approve/reject/revision writes a row.';

COMMENT ON COLUMN public.submission_history.actor_type IS
  'Who triggered the transition: brand (submit/resubmit), admin (approve/reject/request revision), system (automated)';

COMMENT ON COLUMN public.submission_history.notes IS
  'Optional explanation for the transition, typically reviewer_notes for admin actions';

COMMENT ON FUNCTION public.record_submission_transition() IS
  'Trigger function that auto-logs submission state changes to submission_history table';
