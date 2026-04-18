-- Migration: VSF Phase 1 - Products, Formulation Scoring, and Certifications
-- Created: 2026-04-18
-- Purpose: Enable product-level VSF scoring with formulation integrity and certification tracking
-- Phase: 1 of 5 (Foundation)
-- Related Agents: formulation-integrity-agent.md, product-abstraction-agent.md

-- ══════════════════════════════════════════════════════════════
-- 0. Drop existing tables if present (clean slate for development)
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.product_scores CASCADE;
DROP TABLE IF EXISTS public.product_ingredients CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.manufacturers CASCADE;

-- ══════════════════════════════════════════════════════════════
-- 1. Manufacturers Table (Phase 2 prep - stub for now)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  country TEXT, -- e.g., "USA", "Canada"
  
  -- Manufacturing quality indicators (Phase 2)
  gmp_certified BOOLEAN DEFAULT false,
  fda_registered BOOLEAN DEFAULT false,
  third_party_tested BOOLEAN DEFAULT false,
  
  -- Metadata for future scraping
  nsf_gmp_url TEXT, -- URL to verify NSF GMP certification
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. Products Table (Core VSF Entity)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product identification
  brand TEXT NOT NULL, -- e.g., "Thorne", "Life Extension", "NOW Foods"
  name TEXT NOT NULL, -- e.g., "Magnesium Bisglycinate", "Super Omega-3"
  product_url TEXT, -- Link to manufacturer product page
  image_url TEXT, -- Product image
  
  -- Manufacturer relationship (Phase 2)
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
  
  -- Basic product info
  category TEXT NOT NULL, -- e.g., "magnesium", "omega-3", "multivitamin"
  serving_size TEXT, -- e.g., "1 capsule", "2 softgels"
  servings_per_container INTEGER,
  
  -- Pricing
  price_usd DECIMAL(10, 2),
  price_per_serving DECIMAL(10, 2), -- Auto-calculated
  
  -- Product status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'pending_review')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one product per brand+name combo
  UNIQUE(brand, name)
);

-- ══════════════════════════════════════════════════════════════
-- 3. Product Ingredients Junction Table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Ingredient details
  ingredient_name TEXT NOT NULL, -- Must match INGREDIENTS database
  dose DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL, -- mg, mcg, g, IU, etc.
  
  -- Formulation quality (Phase 1 - formulation-integrity-agent)
  form TEXT, -- e.g., "bisglycinate", "citrate", "oxide", "methylcobalamin", "D3"
  bioavailability TEXT CHECK (bioavailability IN ('high', 'medium', 'low')),
  
  -- Other properties
  daily_value_percentage DECIMAL(5, 2), -- % of RDA/DRI
  is_proprietary_blend BOOLEAN DEFAULT false,
  
  -- Ordering for display
  display_order INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 4. Certifications Table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Certification details
  type TEXT NOT NULL CHECK (type IN (
    'nsf_sport', 
    'nsf_gmp', 
    'usp_verified', 
    'informed_sport', 
    'informed_choice',
    'non_gmo',
    'organic_usda',
    'vegan',
    'gluten_free',
    'kosher',
    'halal'
  )),
  
  -- Verification
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_url TEXT, -- URL to verify (NSF database, USP directory, etc.)
  certificate_number TEXT,
  
  -- Expiration tracking
  issued_date DATE,
  expiration_date DATE,
  
  -- Metadata
  verified_at TIMESTAMPTZ, -- When we last verified this cert
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one cert type per product
  UNIQUE(product_id, type)
);

-- ══════════════════════════════════════════════════════════════
-- 5. Product Scores Table (Score History & Transparency)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.product_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Dimension scores (0-100 each)
  evidence_score DECIMAL(5, 2),
  evidence_breakdown JSONB, -- {strong: [], moderate: [], weak: [], totalCitations: N}
  
  safety_score DECIMAL(5, 2),
  safety_breakdown JSONB, -- {critical: [], moderate: [], minor: []}
  
  formulation_score DECIMAL(5, 2),
  formulation_breakdown JSONB, -- {bioavailability: N, doseAccuracy: N, transparency: N, synergy: N}
  
  manufacturing_score DECIMAL(5, 2), -- Phase 2
  manufacturing_breakdown JSONB,
  
  transparency_score DECIMAL(5, 2), -- Phase 2
  transparency_breakdown JSONB,
  
  sustainability_score DECIMAL(5, 2), -- Phase 5
  sustainability_breakdown JSONB,
  
  -- Overall integrity score (weighted average)
  integrity_score DECIMAL(5, 2) NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('rejected', 'standard', 'verified', 'elite')),
  -- Tiers: <60 = rejected, 60-74 = standard, 75-89 = verified, 90+ = elite
  
  -- Score metadata
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scored_by TEXT DEFAULT 'system', -- 'system', 'expert', 'ai_prescreening'
  version TEXT DEFAULT 'v1.0', -- Scoring algorithm version
  
  -- Re-scoring triggers
  rescore_reason TEXT, -- 'new_evidence', 'cert_expired', 'reformulation', 'adverse_event', etc.
  
  -- Current score flag (only one current score per product)
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 6. Indexes for Performance
-- ══════════════════════════════════════════════════════════════

-- Products
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_manufacturer ON products(manufacturer_id);

-- Product Ingredients
CREATE INDEX idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX idx_product_ingredients_name ON product_ingredients(ingredient_name);
CREATE INDEX idx_product_ingredients_form ON product_ingredients(form);
CREATE INDEX idx_product_ingredients_bioavailability ON product_ingredients(bioavailability);

-- Certifications
CREATE INDEX idx_certifications_product ON certifications(product_id);
CREATE INDEX idx_certifications_type ON certifications(type);
CREATE INDEX idx_certifications_verified ON certifications(verified);
CREATE INDEX idx_certifications_expiration ON certifications(expiration_date);

-- Product Scores
CREATE INDEX idx_product_scores_product ON product_scores(product_id);
CREATE INDEX idx_product_scores_tier ON product_scores(tier);
CREATE INDEX idx_product_scores_current ON product_scores(is_current) WHERE is_current = true;
CREATE INDEX idx_product_scores_integrity ON product_scores(integrity_score DESC);

-- Manufacturers
CREATE INDEX idx_manufacturers_name ON manufacturers(name);

-- ══════════════════════════════════════════════════════════════
-- 7. RLS Policies (Public Read, Admin Write)
-- ══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

-- Public read access to active products
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (status = 'active');

-- Public read access to product ingredients
CREATE POLICY "Public can view product ingredients"
  ON product_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_ingredients.product_id 
      AND products.status = 'active'
    )
  );

-- Public read access to verified certifications
CREATE POLICY "Public can view verified certifications"
  ON certifications FOR SELECT
  USING (
    verified = true AND
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = certifications.product_id 
      AND products.status = 'active'
    )
  );

-- Public read access to current product scores
CREATE POLICY "Public can view current product scores"
  ON product_scores FOR SELECT
  USING (
    is_current = true AND
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_scores.product_id 
      AND products.status = 'active'
    )
  );

-- Public read access to manufacturers
CREATE POLICY "Public can view manufacturers"
  ON manufacturers FOR SELECT
  USING (true);

-- Admin policies (TODO: Add admin role check)
-- For now, restrict INSERT/UPDATE/DELETE to service role only

-- ══════════════════════════════════════════════════════════════
-- 8. Helper Functions
-- ══════════════════════════════════════════════════════════════

-- Calculate price per serving
CREATE OR REPLACE FUNCTION calculate_price_per_serving()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price_usd IS NOT NULL AND NEW.servings_per_container IS NOT NULL AND NEW.servings_per_container > 0 THEN
    NEW.price_per_serving := NEW.price_usd / NEW.servings_per_container;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_price_per_serving
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_price_per_serving();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Ensure only one current score per product
CREATE OR REPLACE FUNCTION ensure_single_current_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE product_scores 
    SET is_current = false 
    WHERE product_id = NEW.product_id 
    AND id != NEW.id 
    AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_current_score
  BEFORE INSERT OR UPDATE ON product_scores
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_score();

-- ══════════════════════════════════════════════════════════════
-- 9. Sample Data (Optional - for testing)
-- ══════════════════════════════════════════════════════════════

-- Example manufacturer
INSERT INTO manufacturers (name, website, country, gmp_certified, third_party_tested)
VALUES 
  ('Thorne Research', 'https://www.thorne.com', 'USA', true, true),
  ('Life Extension', 'https://www.lifeextension.com', 'USA', true, true),
  ('NOW Foods', 'https://www.nowfoods.com', 'USA', true, true);

-- Example product (Thorne Magnesium Bisglycinate)
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'Magnesium Bisglycinate',
    'magnesium',
    '1 capsule',
    90,
    22.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT 
  id,
  'Magnesium',
  200,
  'mg',
  'bisglycinate',
  'high',
  1
FROM new_product;

-- Example certifications
INSERT INTO certifications (product_id, type, verified, verification_url)
SELECT 
  id,
  'nsf_sport',
  true,
  'https://www.nsfsport.com/listings/'
FROM products
WHERE brand = 'Thorne' AND name = 'Magnesium Bisglycinate';

-- ══════════════════════════════════════════════════════════════
-- 10. Comments & Documentation
-- ══════════════════════════════════════════════════════════════

COMMENT ON TABLE products IS 'VSF-scored supplement products with formulation and certification tracking';
COMMENT ON TABLE product_ingredients IS 'Junction table: products have many ingredients with specific forms and doses';
COMMENT ON TABLE certifications IS 'Third-party certifications (NSF, USP, Informed Sport, etc.) for products';
COMMENT ON TABLE product_scores IS 'Score history with dimension breakdowns and tier classifications';
COMMENT ON TABLE manufacturers IS 'Supplement manufacturers with GMP and quality indicators';

COMMENT ON COLUMN products.brand IS 'Brand name (e.g., Thorne, Life Extension, NOW Foods)';
COMMENT ON COLUMN product_ingredients.form IS 'Bioavailable form (e.g., bisglycinate, citrate, oxide, methylcobalamin, D3)';
COMMENT ON COLUMN product_ingredients.bioavailability IS 'Absorption quality: high (chelated, methylated), medium (citrate, malate), low (oxide, carbonate)';
COMMENT ON COLUMN certifications.type IS 'Certification type: nsf_sport, usp_verified, informed_sport, etc.';
COMMENT ON COLUMN product_scores.integrity_score IS 'Overall VSF score (0-100) - weighted average of all dimensions';
COMMENT ON COLUMN product_scores.tier IS 'VSF tier: <60 rejected, 60-74 standard, 75-89 verified, 90+ elite';
