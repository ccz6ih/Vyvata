-- Add DSLD product data storage to sessions table
-- Migration: Add dsld_products column

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS dsld_products JSONB;

COMMENT ON COLUMN sessions.dsld_products IS 'DSLD API enrichment results - array of {input, found, dsld: {id, ingredients, etc}}';

-- Create index for faster DSLD data queries
CREATE INDEX IF NOT EXISTS idx_sessions_dsld_products 
ON sessions USING GIN (dsld_products) 
WHERE dsld_products IS NOT NULL;
