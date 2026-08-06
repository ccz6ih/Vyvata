-- Migration: Multi-Category Support + Affiliate Links
-- Date: April 25, 2026
-- Purpose: Add support for 4 product categories (supplement, wearable, diagnostic, sleep)
--          and affiliate link infrastructure for soft launch

-- ============================================================================
-- PART 1: Add category support to products table
-- ============================================================================

-- Add category column with constraint
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'supplement'
  CHECK (category IN ('supplement', 'wearable', 'diagnostic', 'sleep'));

-- Update existing products to be supplements
UPDATE products 
SET category = 'supplement' 
WHERE category IS NULL OR category = '';

-- ============================================================================
-- PART 2: Create product_category_metadata table
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_category_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Wearable-specific fields
  sensor_type TEXT, -- 'optical_hr', 'cgm', 'ecg', 'ppg', 'temperature', 'accelerometer', etc.
  fda_clearance_number TEXT,
  battery_life_hours INT,
  data_export_format TEXT, -- 'csv', 'json', 'api', 'none'
  claimed_accuracy TEXT, -- e.g., "95% sleep stage accuracy", "±2 bpm heart rate"
  
  -- Diagnostic-specific fields
  biomarkers TEXT[], -- array of biomarkers tested, e.g., ['vitamin_d', 'testosterone', 'cortisol']
  clia_number TEXT, -- CLIA laboratory certification number
  cap_accredited BOOLEAN DEFAULT FALSE,
  sample_collection_method TEXT, -- 'finger_prick', 'saliva', 'urine', 'venous_blood', 'stool', etc.
  lab_name TEXT,
  turnaround_time_days INT,
  
  -- Sleep-specific fields
  product_type TEXT, -- 'mattress', 'topper', 'pillow', 'blanket', 'light', 'sound_machine', 'wearable', etc.
  material_composition JSONB, -- e.g., {"cotton": 60, "polyester": 40}, {"memory_foam": 100}
  oeko_tex_certified BOOLEAN DEFAULT FALSE,
  certipur_us_certified BOOLEAN DEFAULT FALSE,
  fire_safety_standard TEXT, -- '16_cfr_1633', 'tb117_2013', 'bs7177', etc.
  therapeutic_parameter TEXT, -- e.g., "55-110°F temp range", "10-5000 lux output", "15 lbs weight"
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_category_metadata_product_id 
  ON product_category_metadata(product_id);

COMMENT ON TABLE product_category_metadata IS 
  'Category-specific metadata for wearables, diagnostics, and sleep products';

-- ============================================================================
-- PART 3: Add affiliate link support to products table
-- ============================================================================

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_program TEXT, -- 'amazon', 'shareasale', 'cj', 'impact', 'direct', etc.
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC(5,2); -- e.g., 15.00 for 15%

COMMENT ON COLUMN products.affiliate_url IS 
  'Affiliate tracking URL for "Shop Now" button';
COMMENT ON COLUMN products.affiliate_program IS 
  'Name of affiliate program/network';
COMMENT ON COLUMN products.affiliate_commission_rate IS 
  'Commission percentage (e.g., 15.00 = 15%)';

-- ============================================================================
-- PART 4: Create affiliate_clicks tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  user_session_id TEXT, -- Anonymous session tracking (no PII)
  referrer TEXT, -- Page user came from
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  ip_address INET -- For fraud detection (hashed or anonymized)
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product_id 
  ON affiliate_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at 
  ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_session 
  ON affiliate_clicks(user_session_id);

COMMENT ON TABLE affiliate_clicks IS 
  'Tracks affiliate link clicks for revenue estimation and product performance analysis';

-- ============================================================================
-- PART 5: Create data_source_cache table (for API responses)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_source_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL, -- 'pubmed', 'fda_510k', 'maude', 'clia', 'ul', 'oeko_tex', 'nsf', 'usp', etc.
  response_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  query_params JSONB -- Store original query for debugging
);

-- Create indexes for cache lookups
CREATE INDEX IF NOT EXISTS idx_data_source_cache_key 
  ON data_source_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_data_source_cache_product_id 
  ON data_source_cache(product_id);
CREATE INDEX IF NOT EXISTS idx_data_source_cache_expires_at 
  ON data_source_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_source_cache_source_type 
  ON data_source_cache(source_type);

COMMENT ON TABLE data_source_cache IS 
  'Caches API responses from external data sources (PubMed, FDA, etc.) to reduce API calls and improve performance';

-- ============================================================================
-- PART 6: Helper function to clean expired cache
-- ============================================================================

CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM data_source_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_cache() IS 
  'Deletes expired cache entries. Run via cron or manually.';

-- ============================================================================
-- PART 7: Create indexes on products table for category filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category 
  ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_status 
  ON products(category, status);

-- ============================================================================
-- PART 8: Update RLS policies (if needed)
-- ============================================================================

-- product_category_metadata: Public reads for active products, service role for writes
-- Note: Admin writes happen server-side using service role key via hasAdminSession()
ALTER TABLE product_category_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for active products" ON product_category_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_category_metadata.product_id 
        AND products.status = 'active'
    )
  );

-- No INSERT/UPDATE/DELETE policies needed - server-side code uses service role key

-- affiliate_clicks: Public insert (anonymous tracking), no public reads
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can track clicks" ON affiliate_clicks
  FOR INSERT WITH CHECK (true);

-- No SELECT policy needed - server-side analytics queries use service role key

-- data_source_cache: Service role only (all operations server-side)
ALTER TABLE data_source_cache ENABLE ROW LEVEL SECURITY;

-- No policies needed - all operations use service role key

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to confirm success)
-- ============================================================================

-- Verify products table has new columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'products' 
--   AND column_name IN ('category', 'affiliate_url', 'affiliate_program', 'affiliate_commission_rate');

-- Verify new tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('product_category_metadata', 'affiliate_clicks', 'data_source_cache');

-- Count existing products by category
-- SELECT category, COUNT(*) 
-- FROM products 
-- GROUP BY category;
