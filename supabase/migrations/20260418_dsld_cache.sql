-- DSLD API Response Cache
-- Caches all DSLD API responses to minimize external API calls
-- Re-pull strategy: daily for active products, quarterly for reference data

CREATE TABLE IF NOT EXISTS dsld_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache key (URL or search params)
  cache_key TEXT NOT NULL UNIQUE,
  request_type TEXT NOT NULL, -- 'product', 'search', 'label'
  
  -- DSLD identifiers
  dsld_id TEXT,
  product_name TEXT,
  brand_name TEXT,
  
  -- Cached response
  response_data JSONB NOT NULL,
  
  -- Cache metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Product status tracking
  is_active_product BOOLEAN DEFAULT FALSE, -- Linked to our products table
  needs_refresh BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_dsld_cache_key ON dsld_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_dsld_cache_dsld_id ON dsld_cache (dsld_id) WHERE dsld_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsld_cache_brand_product ON dsld_cache (brand_name, product_name) WHERE brand_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsld_cache_expires ON dsld_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_dsld_cache_active ON dsld_cache (is_active_product) WHERE is_active_product = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dsld_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dsld_cache_updated_at
  BEFORE UPDATE ON dsld_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_dsld_cache_updated_at();

-- Function to mark products as active when they're in our products table
CREATE OR REPLACE FUNCTION sync_active_products()
RETURNS void AS $$
BEGIN
  UPDATE dsld_cache dc
  SET is_active_product = TRUE
  FROM products p
  WHERE dc.brand_name = p.brand 
    AND dc.product_name = p.name
    AND dc.is_active_product = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for expired cache entries (keep for analytics, just mark as stale)
CREATE OR REPLACE FUNCTION cleanup_expired_dsld_cache()
RETURNS void AS $$
BEGIN
  UPDATE dsld_cache
  SET needs_refresh = TRUE
  WHERE expires_at < NOW()
    AND needs_refresh = FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE dsld_cache IS 'Aggressive caching for DSLD API responses. Daily refresh for active products, quarterly for reference data.';
COMMENT ON COLUMN dsld_cache.cache_key IS 'Unique cache key (URL or normalized search params)';
COMMENT ON COLUMN dsld_cache.is_active_product IS 'TRUE if this product is in our products table (refresh daily)';
COMMENT ON COLUMN dsld_cache.needs_refresh IS 'TRUE when past expires_at (mark stale, dont delete for analytics)';
COMMENT ON COLUMN dsld_cache.hit_count IS 'Number of times this cache entry was used (for popularity tracking)';

-- RPC function for incrementing cache hits
CREATE OR REPLACE FUNCTION increment_dsld_cache_hit(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE dsld_cache
  SET 
    hit_count = hit_count + 1,
    last_accessed_at = NOW()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;
