-- Migration: Create protocols table for named protocol templates
-- Created: 2026-04-18
-- Purpose: Store canonical protocol templates (cognitive-performance, deep-sleep-recovery, etc.)

-- ══════════════════════════════════════════════════════════════
-- 0. Drop existing table if present (clean slate)
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.protocols CASCADE;

-- ══════════════════════════════════════════════════════════════
-- 1. Create protocols table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('foundation', 'optimization', 'therapeutic')),
  goals TEXT[] NOT NULL DEFAULT '{}',
  
  -- Ingredients in this protocol
  ingredients JSONB NOT NULL DEFAULT '[]', -- Array of {name, dose_mg, unit, timing, rationale}
  
  -- Expected outcomes and usage
  expected_benefits TEXT[] NOT NULL DEFAULT '{}',
  timeline TEXT, -- e.g., "2-4 weeks for noticeable effects"
  contraindications TEXT[] NOT NULL DEFAULT '{}',
  monitoring_advice TEXT,
  
  -- Evidence
  evidence_summary TEXT, -- Paragraph with 2-3 key study citations
  evidence_tier TEXT CHECK (evidence_tier IN ('strong', 'moderate', 'weak')),
  
  -- Metadata
  created_by UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. Indexes for performance
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_protocols_slug ON protocols(slug);
CREATE INDEX IF NOT EXISTS idx_protocols_goals ON protocols USING GIN (goals);
CREATE INDEX IF NOT EXISTS idx_protocols_tier ON protocols(tier);
CREATE INDEX IF NOT EXISTS idx_protocols_is_public ON protocols(is_public);
CREATE INDEX IF NOT EXISTS idx_protocols_created_by ON protocols(created_by);

-- ══════════════════════════════════════════════════════════════
-- 3. Row-Level Security (RLS)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

-- Public protocols: anyone can read
CREATE POLICY protocols_select_public ON protocols
  FOR SELECT
  USING (is_public = true);

-- Practitioners can read their own private protocols
CREATE POLICY protocols_select_own ON protocols
  FOR SELECT
  USING (
    created_by IS NOT NULL AND 
    auth.uid() = created_by
  );

-- Only practitioners can create protocols
CREATE POLICY protocols_insert_practitioners ON protocols
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM practitioners 
      WHERE id = auth.uid() 
      AND verification_status = 'approved'
    )
  );

-- Practitioners can update/delete only their own protocols
CREATE POLICY protocols_update_own ON protocols
  FOR UPDATE
  USING (
    auth.uid() = created_by
  );

CREATE POLICY protocols_delete_own ON protocols
  FOR DELETE
  USING (
    auth.uid() = created_by
  );

-- ══════════════════════════════════════════════════════════════
-- 4. Trigger for updated_at timestamp
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_protocols_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protocols_updated_at
  BEFORE UPDATE ON protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_protocols_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 5. Seed with canonical protocol templates (optional)
-- ══════════════════════════════════════════════════════════════

-- Cognitive Performance Protocol
INSERT INTO public.protocols (
  slug,
  name,
  description,
  tier,
  goals,
  ingredients,
  expected_benefits,
  timeline,
  contraindications,
  monitoring_advice,
  evidence_summary,
  evidence_tier,
  is_public
) VALUES (
  'cognitive-performance-v1',
  'Cognitive Performance & Focus',
  'Evidence-based stack for sustained focus, memory, and mental clarity without overstimulation.',
  'optimization',
  ARRAY['focus', 'energy'],
  '[
    {"name": "Caffeine", "dose_mg": 100, "unit": "mg", "timing": "morning", "rationale": "Adenosine antagonist for alertness and focus"},
    {"name": "L-Theanine", "dose_mg": 200, "unit": "mg", "timing": "morning", "rationale": "Smooths caffeine stimulation, promotes calm focus"},
    {"name": "Bacopa Monnieri", "dose_mg": 300, "unit": "mg", "timing": "morning", "rationale": "Memory enhancement, requires 8-12 weeks"},
    {"name": "Lion''s Mane", "dose_mg": 1000, "unit": "mg", "timing": "morning", "rationale": "Neuroprotection and NGF support"},
    {"name": "Citicoline", "dose_mg": 250, "unit": "mg", "timing": "morning", "rationale": "Choline source for acetylcholine synthesis"},
    {"name": "Vitamin B12", "dose_mg": 1, "unit": "mg", "timing": "morning", "rationale": "Energy metabolism and cognitive function"}
  ]'::jsonb,
  ARRAY['Improved focus and mental clarity', 'Enhanced working memory', 'Reduced mental fatigue', 'Smooth sustained energy'],
  '2-4 weeks for noticeable cognitive benefits; Bacopa requires 8-12 weeks for memory effects',
  ARRAY['Avoid if sensitive to caffeine', 'Consult physician if on blood thinners (bacopa)'],
  'Track focus quality, mental fatigue, and sleep quality. Adjust caffeine dose based on tolerance.',
  'Caffeine + L-theanine combination is well-studied (PMID: 18681988). Bacopa improves memory in RCTs (PMID: 23788517). Lion''s mane shows promise for neuroprotection (PMID: 25385080).',
  'strong',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Deep Sleep Recovery Protocol
INSERT INTO public.protocols (
  slug,
  name,
  description,
  tier,
  goals,
  ingredients,
  expected_benefits,
  timeline,
  contraindications,
  monitoring_advice,
  evidence_summary,
  evidence_tier,
  is_public
) VALUES (
  'deep-sleep-recovery-v1',
  'Deep Sleep & Recovery',
  'Comprehensive stack for sleep quality, duration, and next-day recovery without grogginess.',
  'foundation',
  ARRAY['sleep', 'recovery'],
  '[
    {"name": "Magnesium Glycinate", "dose_mg": 400, "unit": "mg", "timing": "evening", "rationale": "GABA-A modulation, best-tolerated form"},
    {"name": "Glycine", "dose_mg": 3000, "unit": "mg", "timing": "evening", "rationale": "Core body temperature reduction for sleep onset"},
    {"name": "L-Theanine", "dose_mg": 200, "unit": "mg", "timing": "evening", "rationale": "Relaxation without sedation"},
    {"name": "Apigenin", "dose_mg": 50, "unit": "mg", "timing": "evening", "rationale": "Chamomile flavonoid, mild anxiolytic"},
    {"name": "Melatonin", "dose_mg": 0.5, "unit": "mg", "timing": "evening", "rationale": "Low-dose for circadian rhythm (not sedation)"}
  ]'::jsonb,
  ARRAY['Faster sleep onset', 'Deeper sleep stages', 'Improved next-day energy', 'No morning grogginess'],
  '1-2 weeks for consistent sleep quality improvement',
  ARRAY['Melatonin not for children/pregnant women', 'Consult physician if on sleep medications'],
  'Track sleep latency, wake-ups, and morning alertness. Consider sleep tracker (Oura, Whoop) for objective data.',
  'Magnesium improves sleep quality (PMID: 33858506). Glycine reduces sleep onset latency (PMID: 22293292). Low-dose melatonin (0.3-1mg) is effective (PMID: 23691216).',
  'strong',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Athletic Performance Protocol
INSERT INTO public.protocols (
  slug,
  name,
  description,
  tier,
  goals,
  ingredients,
  expected_benefits,
  timeline,
  contraindications,
  monitoring_advice,
  evidence_summary,
  evidence_tier,
  is_public
) VALUES (
  'athletic-performance-v1',
  'Athletic Performance & Strength',
  'Evidence-based stack for strength, power output, and endurance in trained athletes.',
  'optimization',
  ARRAY['muscle', 'energy', 'recovery'],
  '[
    {"name": "Creatine Monohydrate", "dose_mg": 5000, "unit": "mg", "timing": "any", "rationale": "Most researched supplement for strength and power"},
    {"name": "Beta-Alanine", "dose_mg": 3200, "unit": "mg", "timing": "pre-workout", "rationale": "Buffering for 1-4 min high-intensity efforts"},
    {"name": "Citrulline", "dose_mg": 6000, "unit": "mg", "timing": "pre-workout", "rationale": "Nitric oxide precursor for blood flow"},
    {"name": "Betaine", "dose_mg": 2500, "unit": "mg", "timing": "pre-workout", "rationale": "Power output and body composition"},
    {"name": "Vitamin D3", "dose_mg": 125, "unit": "mcg", "timing": "morning", "rationale": "Muscle function and testosterone support"},
    {"name": "Magnesium Glycinate", "dose_mg": 400, "unit": "mg", "timing": "evening", "rationale": "Muscle function and recovery"}
  ]'::jsonb,
  ARRAY['Increased strength and power output', 'Improved muscular endurance', 'Faster recovery between sets', 'Enhanced training volume'],
  'Creatine: 2-4 weeks for saturation; Beta-alanine: 2-4 weeks; Others: acute effects',
  ARRAY['Beta-alanine causes harmless tingling (paresthesia)'],
  'Track strength PRs, training volume, and recovery quality. Ensure adequate protein intake (1.6-2.2 g/kg).',
  'Creatine increases lean mass and strength (PMID: 28615996). Beta-alanine improves high-intensity exercise (PMID: 25277852). Citrulline enhances resistance training performance (PMID: 26900386).',
  'strong',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Longevity Foundation Protocol
INSERT INTO public.protocols (
  slug,
  name,
  description,
  tier,
  goals,
  ingredients,
  expected_benefits,
  timeline,
  contraindications,
  monitoring_advice,
  evidence_summary,
  evidence_tier,
  is_public
) VALUES (
  'longevity-foundation-v1',
  'Longevity Foundation',
  'Foundational stack targeting cellular health, NAD+ pathways, inflammation, and healthy aging.',
  'foundation',
  ARRAY['longevity', 'inflammation'],
  '[
    {"name": "NMN", "dose_mg": 500, "unit": "mg", "timing": "morning", "rationale": "NAD+ precursor for cellular energy and DNA repair"},
    {"name": "Resveratrol", "dose_mg": 500, "unit": "mg", "timing": "morning", "rationale": "Sirtuin activator, synergy with NMN"},
    {"name": "Fish Oil", "dose_mg": 2000, "unit": "mg", "timing": "with-food", "rationale": "EPA/DHA for inflammation and cardiovascular health"},
    {"name": "Vitamin D3", "dose_mg": 125, "unit": "mcg", "timing": "morning", "rationale": "Immune, bone, and longevity pathways"},
    {"name": "Vitamin K2", "dose_mg": 100, "unit": "mcg", "timing": "morning", "rationale": "Directs calcium to bones, pairs with D3"},
    {"name": "Magnesium Glycinate", "dose_mg": 400, "unit": "mg", "timing": "evening", "rationale": "Required for 300+ enzymes, D3 activation"},
    {"name": "CoQ10", "dose_mg": 200, "unit": "mg", "timing": "morning", "rationale": "Mitochondrial function and antioxidant"}
  ]'::jsonb,
  ARRAY['Cellular energy optimization', 'Reduced systemic inflammation', 'Cardiovascular support', 'Healthy aging markers'],
  'Ongoing — benefits accumulate over months to years',
  ARRAY['Fish oil may increase bleeding risk at very high doses', 'Vitamin K2 contraindicated with warfarin'],
  'Consider annual biomarkers: hsCRP, lipid panel, vitamin D levels, HbA1c. Track subjective energy and recovery.',
  'NMN raises NAD+ in humans (PMID: 33888596). Fish oil reduces cardiovascular events (PMID: 30415637). Vitamin D3 associated with longevity (PMID: 24523492).',
  'moderate',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Immune Support Protocol
INSERT INTO public.protocols (
  slug,
  name,
  description,
  tier,
  goals,
  ingredients,
  expected_benefits,
  timeline,
  contraindications,
  monitoring_advice,
  evidence_summary,
  evidence_tier,
  is_public
) VALUES (
  'immune-support-v1',
  'Immune Support & Defense',
  'Comprehensive immune optimization stack for daily defense and acute support during illness.',
  'optimization',
  ARRAY['inflammation', 'longevity'],
  '[
    {"name": "Vitamin D3", "dose_mg": 125, "unit": "mcg", "timing": "morning", "rationale": "Critical for innate and adaptive immunity"},
    {"name": "Vitamin C", "dose_mg": 1000, "unit": "mg", "timing": "morning", "rationale": "Immune cell function and antioxidant"},
    {"name": "Zinc", "dose_mg": 30, "unit": "mg", "timing": "evening", "rationale": "Immune signaling and barrier function"},
    {"name": "Quercetin", "dose_mg": 500, "unit": "mg", "timing": "morning", "rationale": "Zinc ionophore, anti-inflammatory flavonoid"},
    {"name": "NAC", "dose_mg": 600, "unit": "mg", "timing": "morning", "rationale": "Glutathione precursor, mucolytic"},
    {"name": "Probiotics", "dose_mg": 10000000000, "unit": "CFU", "timing": "morning", "rationale": "Gut-immune axis support"}
  ]'::jsonb,
  ARRAY['Enhanced immune resilience', 'Reduced infection frequency', 'Faster recovery from illness', 'Gut health optimization'],
  '2-4 weeks for baseline immune enhancement; acute dosing during illness',
  ARRAY['High zinc (>40mg long-term) can deplete copper', 'NAC may interact with nitroglycerin'],
  'Track illness frequency and duration. Consider reducing zinc to 15mg long-term after acute phase.',
  'Vitamin D reduces respiratory infections (PMID: 28202713). Zinc shortens cold duration (PMID: 28515951). NAC reduces influenza symptoms (PMID: 9230243).',
  'moderate',
  true
) ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 6. Comments for documentation
-- ══════════════════════════════════════════════════════════════

COMMENT ON TABLE protocols IS 'Named protocol templates for common health goals (cognitive, sleep, athletic, longevity, immune)';
COMMENT ON COLUMN protocols.slug IS 'URL-safe unique identifier (e.g., cognitive-performance-v1)';
COMMENT ON COLUMN protocols.ingredients IS 'JSONB array of {name, dose_mg, unit, timing, rationale}';
COMMENT ON COLUMN protocols.tier IS 'foundation (everyone) | optimization (advanced) | therapeutic (clinical)';
COMMENT ON COLUMN protocols.evidence_tier IS 'Overall evidence quality: strong (RCTs) | moderate (observational) | weak (traditional)';
