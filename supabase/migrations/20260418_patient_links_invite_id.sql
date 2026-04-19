-- Migration: link patient_links back to the practitioner invite that created them
-- Created: 2026-04-18
-- Purpose: Enables per-invite conversion analytics ("N joined, M unlocked")
--          and lets a practitioner audit which of their invite links is actually
--          producing patients vs just getting clicked.

ALTER TABLE public.patient_links
  ADD COLUMN IF NOT EXISTS invite_id uuid
  REFERENCES public.practitioner_invites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_links_invite_id
  ON public.patient_links (invite_id)
  WHERE invite_id IS NOT NULL;

COMMENT ON COLUMN public.patient_links.invite_id IS 'The practitioner_invites row that created this link, if the patient arrived via an invite. NULL for manually-added patients.';
