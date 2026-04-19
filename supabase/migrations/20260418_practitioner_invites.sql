-- Migration: Practitioner invite links
-- Created: 2026-04-18
-- Purpose: Enable the B2B2C acquisition loop. A practitioner generates a
--          shareable invite link; every patient who consumes it auto-joins
--          that practitioner's panel with their audit linked from the start.

CREATE TABLE IF NOT EXISTS public.practitioner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,

  -- Public URL slug. Short, URL-safe, unguessable. Example: /invite/a7f3c8e1b9d2
  token text NOT NULL UNIQUE,

  -- Optional pre-fill when the invite is used (carries into patient_links)
  label text,                  -- "First name / patient initial" if the practitioner wants one
  notes text,                  -- Clinical notes that transfer onto the patient_link

  -- Usage limits (null/default = reusable; set max_uses=1 for single-use links)
  max_uses int,                -- null = unlimited
  use_count int NOT NULL DEFAULT 0,

  -- Lifecycle
  expires_at timestamptz,      -- null = never expires
  revoked_at timestamptz,      -- manual kill switch; set by practitioner
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- Index for public-token lookups on every patient landing
CREATE INDEX IF NOT EXISTS idx_practitioner_invites_token
  ON public.practitioner_invites (token);

-- Index for listing a practitioner's invites newest-first
CREATE INDEX IF NOT EXISTS idx_practitioner_invites_practitioner
  ON public.practitioner_invites (practitioner_id, created_at DESC);

COMMENT ON TABLE public.practitioner_invites IS 'Shareable invite tokens that auto-link a patient''s audit to the inviting practitioner.';
COMMENT ON COLUMN public.practitioner_invites.token IS 'URL-safe slug used in /invite/[token]. Unguessable; never shown in analytics.';
COMMENT ON COLUMN public.practitioner_invites.max_uses IS 'null = reusable; 1 = single-use per patient; N = cap after N uses.';
COMMENT ON COLUMN public.practitioner_invites.use_count IS 'Incremented on each successful patient_link creation.';
COMMENT ON COLUMN public.practitioner_invites.revoked_at IS 'Timestamp a practitioner killed the link. Non-null = unusable regardless of expiry / count.';
