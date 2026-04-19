-- Add DSLD ID tracking to products table
-- Migration: Add dsld_id column to products for tracking source products from DSLD API

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS dsld_id TEXT;

COMMENT ON COLUMN public.products.dsld_id IS 'DSLD API product ID - used to track imports and prevent duplicates';

-- Create index for faster duplicate checks during import
CREATE INDEX IF NOT EXISTS idx_products_dsld_id 
ON public.products (dsld_id) 
WHERE dsld_id IS NOT NULL;

-- Note: We don't enforce UNIQUE on dsld_id because:
-- 1. Some products may not have a DSLD source (manually added)
-- 2. UNIQUE constraint on (brand, name) already prevents duplicates
-- 3. dsld_id NULL values would cause issues with UNIQUE constraint
