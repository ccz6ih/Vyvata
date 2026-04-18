-- Migration: Add status column to patient_links table
-- Created: 2026-04-18
-- Purpose: Enable patient lifecycle management (active, paused, archived)
--
-- Status values:
-- - 'active': Patient is currently being managed, shows in main dashboard
-- - 'paused': Temporarily inactive (e.g., patient traveling, on hold)
-- - 'archived': No longer active, historical record only

-- Add status column if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'patient_links'
        AND column_name = 'status'
    ) THEN
        -- Add the column with default value
        ALTER TABLE public.patient_links
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        
        -- Add CHECK constraint for valid status values
        ALTER TABLE public.patient_links
        ADD CONSTRAINT patient_links_status_check
        CHECK (status IN ('active', 'paused', 'archived'));
        
        RAISE NOTICE 'Added status column to patient_links table';
    ELSE
        RAISE NOTICE 'Status column already exists, skipping';
    END IF;
END
$$;

-- Backfill existing rows to ensure they have 'active' status
-- This is idempotent - only updates NULL values (shouldn't exist with NOT NULL + DEFAULT, but safe)
UPDATE public.patient_links
SET status = 'active'
WHERE status IS NULL OR status = '';

-- Create composite index for efficient dashboard queries
-- Index name follows pattern: {table}_{columns}_idx
DROP INDEX IF EXISTS public.patient_links_practitioner_id_status_idx;
CREATE INDEX patient_links_practitioner_id_status_idx
ON public.patient_links(practitioner_id, status);

-- Add comment to document the column
COMMENT ON COLUMN public.patient_links.status IS 'Patient lifecycle status: active (currently managed), paused (temporarily inactive), or archived (historical record only)';
