-- Migration: add products.slug for shareable, SEO-friendly URLs
-- Created: 2026-04-18
-- Purpose: Replace UUID-based /products/[id] with /products/[slug] like
--          /products/thorne-magnesium-bisglycinate. Old UUID URLs keep
--          working via a permanent redirect in the page handler.

-- ── 1. slug column (nullable so the backfill can run in two steps) ───────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text;

-- ── 2. slugify helper: lowercase, alnum-only, hyphen-collapsed ───────────
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
           both '-' from
           regexp_replace(
             regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'),
             '-+', '-', 'g'
           )
         );
$$;

-- ── 3. one-time backfill for existing rows ───────────────────────────────
-- `slug = slugify(brand || ' ' || name)`, suffixed with 6 chars of the
-- id if the slugified string isn't unique (handles brand+name collisions).
UPDATE public.products AS p
SET slug = base_slug
FROM (
  SELECT
    id,
    CASE
      WHEN cnt = 1 THEN base
      ELSE base || '-' || substring(id::text, 1, 6)
    END AS base_slug
  FROM (
    SELECT
      id,
      public.slugify(brand || ' ' || name) AS base,
      count(*) OVER (PARTITION BY public.slugify(brand || ' ' || name)) AS cnt
    FROM public.products
  ) s
) AS resolved
WHERE p.id = resolved.id
  AND p.slug IS NULL;

-- ── 4. enforce NOT NULL + UNIQUE going forward ───────────────────────────
ALTER TABLE public.products
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug
  ON public.products (slug);

-- ── 5. trigger: new rows and brand/name edits auto-get a slug ────────────
-- Keeps slug stable once set, but if it's null at insert we generate one.
-- Never auto-rewrites an existing slug (those are shareable URLs; changing
-- them would break everyone who's linked).
CREATE OR REPLACE FUNCTION public.products_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  attempt int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  candidate := public.slugify(NEW.brand || ' ' || NEW.name);
  -- Collision handling: append short id suffix if taken.
  WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = candidate) AND attempt < 5 LOOP
    candidate := public.slugify(NEW.brand || ' ' || NEW.name)
                 || '-' || substring(NEW.id::text, 1 + attempt * 6, 6);
    attempt := attempt + 1;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_set_slug ON public.products;
CREATE TRIGGER trg_products_set_slug
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_set_slug();

COMMENT ON COLUMN public.products.slug IS 'URL-safe, brand+name derived. Unique. Stable once set — never rewrite, shareable URLs depend on it.';
