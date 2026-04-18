-- Migration: Create patient_notes table for practitioner notes on patients
-- Created: 2026-04-18
-- Purpose: Enable practitioners to add timestamped notes to patients for tracking and documentation

-- ══════════════════════════════════════════════════════════════
-- 0. Drop existing table if present (clean slate)
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.patient_notes CASCADE;

-- ══════════════════════════════════════════════════════════════
-- 1. Create patient_notes table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to patient_links (cascade delete when patient link removed)
  patient_link_id UUID NOT NULL REFERENCES patient_links(id) ON DELETE CASCADE,
  
  -- Note content
  note TEXT NOT NULL,
  
  -- Audit trail: who created this note (nullable for data integrity if practitioner deleted)
  created_by UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. Indexes for performance
-- ══════════════════════════════════════════════════════════════

-- Fast lookup of all notes for a specific patient
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_link_id ON patient_notes(patient_link_id);

-- Fast lookup of all notes created by a specific practitioner
CREATE INDEX IF NOT EXISTS idx_patient_notes_created_by ON patient_notes(created_by);

-- Composite index for practitioner viewing their patients' notes (common query pattern)
CREATE INDEX IF NOT EXISTS idx_patient_notes_created_by_patient ON patient_notes(created_by, patient_link_id);

-- ══════════════════════════════════════════════════════════════
-- 3. Row-Level Security (RLS)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- Practitioners can SELECT notes only for their own patients
-- Note: This policy also enables UPDATE (UPDATE requires SELECT in Postgres RLS)
CREATE POLICY patient_notes_select_own_patients ON patient_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_links
      WHERE patient_links.id = patient_notes.patient_link_id
      AND patient_links.practitioner_id = auth.uid()
    )
  );

-- Practitioners can INSERT notes only for their own patients
CREATE POLICY patient_notes_insert_own_patients ON patient_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient_links
      WHERE patient_links.id = patient_notes.patient_link_id
      AND patient_links.practitioner_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Practitioners can UPDATE only their own notes
-- Note: The SELECT policy above is required for this to work
CREATE POLICY patient_notes_update_own ON patient_notes
  FOR UPDATE
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- Practitioners can DELETE only their own notes
CREATE POLICY patient_notes_delete_own ON patient_notes
  FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- ══════════════════════════════════════════════════════════════
-- 4. Trigger for updated_at timestamp
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_patient_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_patient_notes_updated_at
  BEFORE UPDATE ON patient_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_notes_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 5. Comments for documentation
-- ══════════════════════════════════════════════════════════════

COMMENT ON TABLE patient_notes IS 'Practitioner notes on patients for tracking and documentation (Phase 3)';
COMMENT ON COLUMN patient_notes.patient_link_id IS 'FK to patient_links; cascades delete when patient link removed';
COMMENT ON COLUMN patient_notes.created_by IS 'Practitioner who created this note; nullable for audit trail if practitioner deleted';
COMMENT ON COLUMN patient_notes.note IS 'Free-text note content; no length limit';
