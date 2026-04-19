-- Migration: scraper_runs observability table
-- Created: 2026-04-21
-- Purpose: Give the operations layer a single source of truth for
--          "did every scraper run, when, and what did it produce?"
--          Every cron-invoked scraper writes one row per run. Let us
--          answer "did compliance sync run today?" with a query, not a
--          guess at Vercel's cron UI.
-- Related: .agents/briefs/02-cron-scraper-recovery.md §2

CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which scraper ran. Free text so new scrapers don't need a schema
  -- migration to be observable; typical values: 'openfda_recalls',
  -- 'openfda_caers', 'fda_warning_letters', 'nsf_sport',
  -- 'certifications', 'rescore_products', 'dsld_import'.
  scraper_name TEXT NOT NULL,

  -- Lifecycle timestamps. ended_at is NULL while the run is in flight;
  -- callers update the row at the end to record completion.
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Outcome. 'partial' when the scraper completed but with errors —
  -- e.g. 3 of 5 sources returned data, 2 threw. Lets us distinguish
  -- "broken" from "degraded" at a glance.
  status TEXT CHECK (status IN ('success', 'failure', 'partial')),

  -- What it actually wrote. Convention: inserted = net-new rows,
  -- updated = existing rows touched (e.g. upserts that matched an
  -- existing source_id). Both 0 is a legitimate "no new data" result.
  rows_inserted INT DEFAULT 0,
  rows_updated INT DEFAULT 0,

  -- On failure: short human-readable message. Don't dump full stack
  -- traces here — put those in raw_output so error_message stays
  -- summary-readable for an admin glance.
  error_message TEXT,

  -- Per-run debug payload. Anything useful for future triage: per-source
  -- counts, response status codes, sample matches. Kept as JSONB so we
  -- can query inside it later without a schema change.
  raw_output JSONB
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_name_started
  ON public.scraper_runs (scraper_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_recent_failures
  ON public.scraper_runs (started_at DESC)
  WHERE status IN ('failure', 'partial');

COMMENT ON TABLE public.scraper_runs IS
  'One row per scraper invocation. Populated by src/lib/scraper-observability.ts wrapScraperRun(). Source of truth for "did this pipeline run?"';
COMMENT ON COLUMN public.scraper_runs.status IS
  'success = clean run, failure = threw before completing, partial = completed but some per-source errors collected in raw_output.';

-- RLS: only service role writes (scrapers run server-side); admins read
-- through server-side endpoints. Anon has no access.
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scraper_runs_service ON public.scraper_runs;
CREATE POLICY scraper_runs_service ON public.scraper_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
