-- Create manufacturer_certifications table for tracking facility-level certifications
-- (e.g., cGMP, NSF GMP, ISO, Informed Choice facility certification)

CREATE TABLE IF NOT EXISTS public.manufacturer_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  certification_number TEXT,
  issuing_body TEXT,
  scope TEXT, -- What products/processes this certification covers
  evidence_url TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_manufacturer_certifications_manufacturer_id 
  ON public.manufacturer_certifications(manufacturer_id);

CREATE INDEX IF NOT EXISTS idx_manufacturer_certifications_type 
  ON public.manufacturer_certifications(certification_type);

-- Unique constraint: one certification type per manufacturer
CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturer_certifications_unique
  ON public.manufacturer_certifications(manufacturer_id, certification_type);

-- Enable RLS
ALTER TABLE public.manufacturer_certifications ENABLE ROW LEVEL SECURITY;

-- Allow public read access (certifications are public information)
CREATE POLICY "Allow public read access to manufacturer certifications"
  ON public.manufacturer_certifications
  FOR SELECT
  USING (true);

-- Allow service role full access (for automated syncing)
CREATE POLICY "Allow service role full access to manufacturer certifications"
  ON public.manufacturer_certifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_manufacturer_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manufacturer_certifications_updated_at
  BEFORE UPDATE ON public.manufacturer_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_manufacturer_certifications_updated_at();

-- Add comment
COMMENT ON TABLE public.manufacturer_certifications IS 'Facility-level certifications for supplement manufacturers (cGMP, NSF GMP, ISO, etc.)';
