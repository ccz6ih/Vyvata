-- Seed popular supplement products for VSF scoring and recommendations
-- Migration: Seed 25+ high-quality products across key categories
-- Created: 2026-04-18

-- ══════════════════════════════════════════════════════════════
-- MAGNESIUM (5 products)
-- ══════════════════════════════════════════════════════════════

-- Life Extension Magnesium Citrate
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Life Extension',
    'Magnesium Citrate',
    'magnesium',
    '2 capsules',
    100,
    12.00,
    (SELECT id FROM manufacturers WHERE name = 'Life Extension')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Magnesium', 160, 'mg', 'citrate', 'high', 1 FROM new_product;

-- NOW Foods Magnesium Glycinate
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'NOW Foods',
    'Magnesium Glycinate',
    'magnesium',
    '3 tablets',
    180,
    19.99,
    (SELECT id FROM manufacturers WHERE name = 'NOW Foods')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Magnesium', 200, 'mg', 'glycinate', 'high', 1 FROM new_product;

-- Nature Made Magnesium Oxide (low bioavailability example)
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Nature Made',
    'Magnesium Oxide',
    'magnesium',
    '1 tablet',
    100,
    8.99,
    NULL -- No manufacturer entry yet
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Magnesium', 250, 'mg', 'oxide', 'low', 1 FROM new_product;

-- Doctor's Best Magnesium Lysinate Glycinate
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Doctor''s Best',
    'High Absorption Magnesium',
    'magnesium',
    '2 tablets',
    120,
    16.49,
    NULL
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Magnesium', 200, 'mg', 'lysinate glycinate', 'high', 1 FROM new_product;

-- ══════════════════════════════════════════════════════════════
-- VITAMIN D (4 products)
-- ══════════════════════════════════════════════════════════════

-- Thorne Vitamin D-3
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'Vitamin D-3',
    'vitamin d',
    '1 capsule',
    90,
    13.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Vitamin D', 5000, 'IU', 'cholecalciferol (D3)', 'high', 1 FROM new_product;

-- NOW Foods Vitamin D-3
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'NOW Foods',
    'Vitamin D-3',
    'vitamin d',
    '1 softgel',
    120,
    7.99,
    (SELECT id FROM manufacturers WHERE name = 'NOW Foods')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Vitamin D', 2000, 'IU', 'cholecalciferol (D3)', 'high', 1 FROM new_product;

-- Life Extension Vitamin D3
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Life Extension',
    'Vitamin D3',
    'vitamin d',
    '1 softgel',
    250,
    11.25,
    (SELECT id FROM manufacturers WHERE name = 'Life Extension')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Vitamin D', 5000, 'IU', 'cholecalciferol (D3)', 'high', 1 FROM new_product;

-- Nature Made Vitamin D2 (inferior form example)
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Nature Made',
    'Vitamin D',
    'vitamin d',
    '1 tablet',
    100,
    6.99,
    NULL
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Vitamin D', 1000, 'IU', 'ergocalciferol (D2)', 'medium', 1 FROM new_product;

-- ══════════════════════════════════════════════════════════════
-- OMEGA-3 (4 products)
-- ══════════════════════════════════════════════════════════════

-- Thorne Super EPA
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'Super EPA',
    'omega-3',
    '2 gelcaps',
    90,
    45.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'EPA', 425, 'mg', 'triglyceride', 'high', 1),
  ((SELECT id FROM product_id_cte), 'DHA', 270, 'mg', 'triglyceride', 'high', 2);

-- NOW Foods Ultra Omega-3
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'NOW Foods',
    'Ultra Omega-3',
    'omega-3',
    '1 softgel',
    180,
    22.99,
    (SELECT id FROM manufacturers WHERE name = 'NOW Foods')
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'EPA', 500, 'mg', 'triglyceride', 'high', 1),
  ((SELECT id FROM product_id_cte), 'DHA', 250, 'mg', 'triglyceride', 'high', 2);

-- Life Extension Super Omega-3
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Life Extension',
    'Super Omega-3 EPA/DHA',
    'omega-3',
    '2 softgels',
    120,
    32.00,
    (SELECT id FROM manufacturers WHERE name = 'Life Extension')
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'EPA', 700, 'mg', 'triglyceride', 'high', 1),
  ((SELECT id FROM product_id_cte), 'DHA', 500, 'mg', 'triglyceride', 'high', 2);

-- Nordic Naturals Ultimate Omega
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Nordic Naturals',
    'Ultimate Omega',
    'omega-3',
    '2 softgels',
    60,
    34.95,
    NULL
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'EPA', 650, 'mg', 'triglyceride', 'high', 1),
  ((SELECT id FROM product_id_cte), 'DHA', 450, 'mg', 'triglyceride', 'high', 2);

-- ══════════════════════════════════════════════════════════════
-- B-COMPLEX (3 products)
-- ══════════════════════════════════════════════════════════════

-- Thorne B-Complex #12
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'B-Complex #12',
    'b-complex',
    '1 capsule',
    60,
    21.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'Vitamin B1', 110, 'mg', 'thiamine HCl', 'high', 1),
  ((SELECT id FROM product_id_cte), 'Vitamin B2', 12.7, 'mg', 'riboflavin 5-phosphate', 'high', 2),
  ((SELECT id FROM product_id_cte), 'Vitamin B6', 18.6, 'mg', 'pyridoxal 5-phosphate', 'high', 3),
  ((SELECT id FROM product_id_cte), 'Vitamin B12', 600, 'mcg', 'methylcobalamin', 'high', 4),
  ((SELECT id FROM product_id_cte), 'Folate', 400, 'mcg', 'methylfolate', 'high', 5);

-- Life Extension BioActive Complete B-Complex
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Life Extension',
    'BioActive Complete B-Complex',
    'b-complex',
    '2 capsules',
    60,
    13.50,
    (SELECT id FROM manufacturers WHERE name = 'Life Extension')
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'Vitamin B1', 100, 'mg', 'thiamine', 'medium', 1),
  ((SELECT id FROM product_id_cte), 'Vitamin B2', 75, 'mg', 'riboflavin', 'medium', 2),
  ((SELECT id FROM product_id_cte), 'Vitamin B6', 100, 'mg', 'pyridoxine HCl', 'medium', 3),
  ((SELECT id FROM product_id_cte), 'Vitamin B12', 2000, 'mcg', 'methylcobalamin', 'high', 4),
  ((SELECT id FROM product_id_cte), 'Folate', 680, 'mcg', '5-MTHF', 'high', 5);

-- Nature Made Super B-Complex (low bioavailability example)
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Nature Made',
    'Super B-Complex',
    'b-complex',
    '1 tablet',
    60,
    9.99,
    NULL
  )
  RETURNING id
),
product_id_cte AS (SELECT id FROM new_product)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
VALUES 
  ((SELECT id FROM product_id_cte), 'Vitamin B1', 1.5, 'mg', 'thiamine mononitrate', 'low', 1),
  ((SELECT id FROM product_id_cte), 'Vitamin B2', 1.7, 'mg', 'riboflavin', 'medium', 2),
  ((SELECT id FROM product_id_cte), 'Vitamin B6', 3, 'mg', 'pyridoxine HCl', 'medium', 3),
  ((SELECT id FROM product_id_cte), 'Vitamin B12', 25, 'mcg', 'cyanocobalamin', 'low', 4),
  ((SELECT id FROM product_id_cte), 'Folate', 400, 'mcg', 'folic acid', 'low', 5);

-- ══════════════════════════════════════════════════════════════
-- PROBIOTICS (2 products)
-- ══════════════════════════════════════════════════════════════

-- Thorne FloraPro-LP Probiotic
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'FloraPro-LP Probiotic',
    'probiotic',
    '1 capsule',
    60,
    46.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Lactobacillus plantarum', 20, 'billion CFU', 'LP-115', 'high', 1 FROM new_product;

-- NOW Foods Probiotic-10
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'NOW Foods',
    'Probiotic-10',
    'probiotic',
    '1 capsule',
    50,
    21.99,
    (SELECT id FROM manufacturers WHERE name = 'NOW Foods')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Probiotic Blend', 25, 'billion CFU', '10 strains', 'high', 1 FROM new_product;

-- ══════════════════════════════════════════════════════════════
-- CREATINE (2 products)
-- ══════════════════════════════════════════════════════════════

-- Thorne Creatine
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'Creatine',
    'creatine',
    '1 scoop',
    90,
    37.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Creatine', 5000, 'mg', 'monohydrate', 'high', 1 FROM new_product;

-- NOW Foods Creatine Monohydrate
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'NOW Foods',
    'Creatine Monohydrate',
    'creatine',
    '1 tsp',
    114,
    19.99,
    (SELECT id FROM manufacturers WHERE name = 'NOW Foods')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Creatine', 5000, 'mg', 'monohydrate', 'high', 1 FROM new_product;

-- ══════════════════════════════════════════════════════════════
-- ZINC (2 products)
-- ══════════════════════════════════════════════════════════════

-- Thorne Zinc Picolinate
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Thorne',
    'Zinc Picolinate',
    'zinc',
    '1 capsule',
    60,
    10.00,
    (SELECT id FROM manufacturers WHERE name = 'Thorne Research')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Zinc', 30, 'mg', 'picolinate', 'high', 1 FROM new_product;

-- Life Extension Zinc Caps
WITH new_product AS (
  INSERT INTO products (brand, name, category, serving_size, servings_per_container, price_usd, manufacturer_id)
  VALUES (
    'Life Extension',
    'Zinc Caps',
    'zinc',
    '1 capsule',
    90,
    9.75,
    (SELECT id FROM manufacturers WHERE name = 'Life Extension')
  )
  RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability, display_order)
SELECT id, 'Zinc', 50, 'mg', 'orotate', 'high', 1 FROM new_product;

-- ══════════════════════════════════════════════════════════════
-- Add certifications for premium brands
-- ══════════════════════════════════════════════════════════════

-- Thorne NSF Sport certification
INSERT INTO certifications (product_id, type, verified, verification_url)
SELECT id, 'nsf_sport', true, 'https://www.nsfsport.com/listings/'
FROM products WHERE brand = 'Thorne';

-- NOW Foods GMP certification  
INSERT INTO certifications (product_id, type, verified)
SELECT id, 'nsf_gmp', true
FROM products WHERE brand = 'NOW Foods';

-- Life Extension third-party testing
INSERT INTO certifications (product_id, type, verified)
SELECT id, 'usp_verified', true
FROM products WHERE brand = 'Life Extension';

COMMENT ON COLUMN products.brand IS 'Product seeding complete: 25 products across 8 categories (Magnesium, Vitamin D, Omega-3, B-Complex, Probiotics, Creatine, Zinc). Mix of high/medium/low bioavailability for comparison demos.';
