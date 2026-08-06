-- Seed: 20 Example Products Across All Categories
-- Date: April 25, 2026
-- Purpose: Provide Ashley with diverse product examples for each category
--          These demonstrate the data structure and scoring criteria

-- Note: This assumes the main migration (20260425_multi_category_support.sql) has been applied

-- ============================================================================
-- SUPPLEMENTS (5 products)
-- ============================================================================

-- 1. Magnesium Threonate (Brain Health)
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, serving_size, servings_per_container, price_per_serving, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Magtein',
    'Magnesium L-Threonate',
    'supplement',
    'active',
    39.99,
    '3 capsules',
    30,
    1.33,
    'https://www.amazon.com/dp/B0CJ5K7MXN?tag=vyvata-20',
    'amazon',
    8.00
  ) RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability)
SELECT id, 'Magnesium L-Threonate', 2000, 'mg', 'Magtein®', 'high' FROM new_product
UNION ALL
SELECT id, 'Elemental Magnesium', 144, 'mg', NULL, NULL FROM new_product;

-- 2. Omega-3 (High EPA/DHA)
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, serving_size, servings_per_container, price_per_serving, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Nordic Naturals',
    'Ultimate Omega',
    'supplement',
    'active',
    56.95,
    '2 softgels',
    60,
    0.95,
    'https://www.shareasale.com/r.cfm?b=123456&u=987654&m=12345',
    'shareasale',
    15.00
  ) RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability)
SELECT id, 'EPA (Eicosapentaenoic Acid)', 650, 'mg', 'Triglyceride form', 'high' FROM new_product
UNION ALL
SELECT id, 'DHA (Docosahexaenoic Acid)', 450, 'mg', 'Triglyceride form', 'high' FROM new_product;

-- 3. Vitamin D3 + K2 (Bone Health)
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, serving_size, servings_per_container, price_per_serving, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Thorne',
    'Vitamin D/K2 Liquid',
    'supplement',
    'active',
    33.00,
    '2 drops',
    60,
    0.55,
    'https://www.thorne.com/products/dp/vitamin-d-k2-liquid?aff=vyvata',
    'direct',
    25.00
  ) RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability)
SELECT id, 'Vitamin D3', 1000, 'IU', 'Cholecalciferol', 'high' FROM new_product
UNION ALL
SELECT id, 'Vitamin K2', 200, 'mcg', 'MK-4', 'high' FROM new_product;

-- 4. Curcumin (Anti-Inflammatory)
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, serving_size, servings_per_container, price_per_serving, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Thorne',
    'Meriva 500-SF',
    'supplement',
    'active',
    49.00,
    '1 capsule',
    120,
    0.41,
    'https://www.thorne.com/products/dp/meriva-500-sf?aff=vyvata',
    'direct',
    25.00
  ) RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability)
SELECT id, 'Curcumin Phytosome', 500, 'mg', 'Meriva® (complexed with phosphatidylcholine)', 'high' FROM new_product;

-- 5. Creatine Monohydrate (Performance)
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, serving_size, servings_per_container, price_per_serving, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Thorne',
    'Creatine',
    'supplement',
    'active',
    35.00,
    '1 scoop (5g)',
    90,
    0.39,
    'https://www.thorne.com/products/dp/creatine?aff=vyvata',
    'direct',
    25.00
  ) RETURNING id
)
INSERT INTO product_ingredients (product_id, ingredient_name, dose, unit, form, bioavailability)
SELECT id, 'Creatine Monohydrate', 5, 'g', 'Creapure® (micronized)', 'high' FROM new_product;

-- ============================================================================
-- WEARABLES & TRACKING (5 products)
-- ============================================================================

-- 6. Oura Ring Gen 3
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Oura',
    'Ring Gen 3',
    'wearable',
    'active',
    299.00,
    'https://www.avantlink.com/click.php?tt=ml&merchant_id=12345&url=ouraring.com',
    'impact',
    12.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (product_id, sensor_type, fda_clearance_number, battery_life_hours, data_export_format, claimed_accuracy)
SELECT id, 'multi_sensor', NULL, 168, 'csv', '99.6% resting HR accuracy (validated), 79% sleep stage accuracy vs PSG' FROM new_product;

-- 7. Dexcom G7 CGM
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Dexcom',
    'G7 Continuous Glucose Monitor',
    'wearable',
    'active',
    199.00,
    'https://www.dexcom.com/g7?aff=vyvata',
    'direct',
    8.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (product_id, sensor_type, fda_clearance_number, battery_life_hours, data_export_format, claimed_accuracy)
SELECT id, 'cgm', 'K210691', 240, 'api', '±8.1% MARD (Mean Absolute Relative Difference) vs lab reference' FROM new_product;

-- 8. WHOOP 4.0
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'WHOOP',
    '4.0 Fitness Tracker',
    'wearable',
    'active',
    239.00,
    'https://join.whoop.com/vyvata',
    'direct',
    15.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (product_id, sensor_type, fda_clearance_number, battery_life_hours, data_export_format, claimed_accuracy)
SELECT id, 'optical_hr', NULL, 120, 'api', '99.7% HR accuracy (WHOOP study), HRV accuracy ±3ms' FROM new_product;

-- 9. Apple Watch Series 9
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Apple',
    'Watch Series 9',
    'wearable',
    'active',
    399.00,
    'https://www.apple.com/shop/buy-watch/apple-watch?afid=vyvata',
    'cj',
    2.50
  ) RETURNING id
)
INSERT INTO product_category_metadata (product_id, sensor_type, fda_clearance_number, battery_life_hours, data_export_format, claimed_accuracy)
SELECT id, 'multi_sensor', 'K181454', 18, 'json', 'ECG app FDA cleared for AFib detection, ±2 bpm HR accuracy' FROM new_product;

-- 10. Levels CGM Program
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Levels',
    'Metabolic Awareness Program',
    'wearable',
    'active',
    199.00,
    'https://www.levelshealth.com/vyvata',
    'direct',
    20.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (product_id, sensor_type, fda_clearance_number, battery_life_hours, data_export_format, claimed_accuracy)
SELECT id, 'cgm', 'K210691', 240, 'csv', 'Uses Dexcom G7 sensor (±8.1% MARD)' FROM new_product;

-- ============================================================================
-- DIAGNOSTICS & TESTING (5 products)
-- ============================================================================

-- 11. InsideTracker Ultimate Plan
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'InsideTracker',
    'Ultimate Blood Panel',
    'diagnostic',
    'active',
    589.00,
    'https://www.insidetracker.com/plans/ultimate?code=VYVATA',
    'direct',
    18.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id, 
  biomarkers, 
  clia_number, 
  cap_accredited, 
  sample_collection_method, 
  lab_name,
  turnaround_time_days
)
SELECT 
  id,
  ARRAY['glucose', 'hba1c', 'vitamin_d', 'testosterone', 'cortisol', 'tsh', 'ferritin', 'crp', 'ldl', 'hdl', 'triglycerides', 'alt', 'ast', 'creatinine', 'calcium', 'magnesium', 'vitamin_b12', 'folate', 'apob'],
  '22D2027531',
  false,
  'venous_blood',
  'Quest Diagnostics',
  7
FROM new_product;

-- 12. Viome Gut Intelligence Test
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Viome',
    'Gut Intelligence Test',
    'diagnostic',
    'active',
    129.00,
    'https://www.viome.com/products/gut-intelligence?ref=vyvata',
    'shareasale',
    12.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id, 
  biomarkers, 
  clia_number, 
  cap_accredited, 
  sample_collection_method, 
  lab_name,
  turnaround_time_days
)
SELECT 
  id,
  ARRAY['gut_microbiome_composition', 'metabolic_pathways', 'inflammatory_markers', 'digestive_efficiency'],
  '35D2212345',
  false,
  'stool',
  'Viome Life Sciences',
  14
FROM new_product;

-- 13. Everlywell Thyroid Test
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Everlywell',
    'Thyroid Test',
    'diagnostic',
    'active',
    79.00,
    'https://www.everlywell.com/products/thyroid-test/?aid=vyvata',
    'cj',
    10.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id, 
  biomarkers, 
  clia_number, 
  cap_accredited, 
  sample_collection_method, 
  lab_name,
  turnaround_time_days
)
SELECT 
  id,
  ARRAY['tsh', 't3', 't4', 'tpo_antibody'],
  '05D2081665',
  false,
  'finger_prick',
  'PWNHealth Network',
  5
FROM new_product;

-- 14. 23andMe Health + Ancestry
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    '23andMe',
    'Health + Ancestry Service',
    'diagnostic',
    'active',
    199.00,
    'https://refer.23andme.com/v2/share/vyvata',
    'direct',
    15.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id, 
  biomarkers, 
  clia_number, 
  cap_accredited, 
  sample_collection_method, 
  lab_name,
  turnaround_time_days
)
SELECT 
  id,
  ARRAY['genetic_health_risks', 'carrier_status', 'wellness_traits', 'ancestry_composition'],
  '05D2070493',
  true,
  'saliva',
  '23andMe Laboratory',
  21
FROM new_product;

-- 15. Function Health Full Body Panel
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Function Health',
    'Full Body Annual Membership',
    'diagnostic',
    'active',
    499.00,
    'https://www.functionhealth.com/?via=vyvata',
    'direct',
    25.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id, 
  biomarkers, 
  clia_number, 
  cap_accredited, 
  sample_collection_method, 
  lab_name,
  turnaround_time_days
)
SELECT 
  id,
  ARRAY['glucose', 'hba1c', 'insulin', 'vitamin_d', 'testosterone', 'estradiol', 'cortisol', 'dhea', 'tsh', 'free_t3', 'free_t4', 'tpo', 'ferritin', 'iron', 'tibc', 'crp', 'homocysteine', 'apob', 'lp_a', 'ldl', 'hdl', 'triglycerides', 'alt', 'ast', 'ggt', 'alp', 'bilirubin', 'albumin', 'creatinine', 'egfr', 'bun', 'uric_acid', 'calcium', 'magnesium', 'phosphorus', 'sodium', 'potassium', 'chloride', 'co2', 'wbc', 'rbc', 'hemoglobin', 'hematocrit', 'platelet_count'],
  '22D2027531',
  false,
  'venous_blood',
  'Quest Diagnostics',
  7
FROM new_product;

-- ============================================================================
-- SLEEP OPTIMIZATION (5 products)
-- ============================================================================

-- 16. Eight Sleep Pod 4
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Eight Sleep',
    'Pod 4 Ultra',
    'sleep',
    'active',
    2599.00,
    'https://www.eightsleep.com/pod-4-ultra/?promo=VYVATA',
    'direct',
    10.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id,
  product_type,
  material_composition,
  oeko_tex_certified,
  certipur_us_certified,
  fire_safety_standard,
  therapeutic_parameter
)
SELECT 
  id,
  'temperature_regulator',
  '{"memory_foam": 30, "polyurethane_foam": 40, "cooling_gel": 15, "cover_fabric": 15}'::jsonb,
  true,
  true,
  '16_cfr_1633',
  'Temperature range: 55-110°F, ±0.5°F accuracy, autopilot adjusts based on sleep stage'
FROM new_product;

-- 17. Hatch Restore 2 Sunrise Alarm
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Hatch',
    'Restore 2',
    'sleep',
    'active',
    199.99,
    'https://www.hatch.co/restore-2?ref=vyvata',
    'shareasale',
    8.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id,
  product_type,
  material_composition,
  oeko_tex_certified,
  certipur_us_certified,
  fire_safety_standard,
  therapeutic_parameter
)
SELECT 
  id,
  'sleep_mask',
  '{"plastic": 80, "fabric": 20}'::jsonb,
  false,
  false,
  'none',
  'Light output: 10-5000 lux adjustable, color temp 2000K-6500K, sound 40-85dB'
FROM new_product;

-- 18. Gravity Weighted Blanket
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Gravity',
    'Weighted Blanket (20 lbs)',
    'sleep',
    'active',
    195.00,
    'https://www.amazon.com/dp/B07JN88ZSJ?tag=vyvata-20',
    'amazon',
    8.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id,
  product_type,
  material_composition,
  oeko_tex_certified,
  certipur_us_certified,
  fire_safety_standard,
  therapeutic_parameter
)
SELECT 
  id,
  'weighted_blanket',
  '{"cotton": 60, "polyester": 30, "glass_beads": 10}'::jsonb,
  true,
  false,
  'none',
  'Weight: 20 lbs (10% of 200 lb body weight recommended for deep pressure stimulation)'
FROM new_product;

-- 19. Felix Gray Blue Light Blocking Glasses
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Felix Gray',
    'Nash Blue Light Glasses',
    'sleep',
    'active',
    95.00,
    'https://felixgrayglasses.com/products/nash?ref=vyvata',
    'shareasale',
    12.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id,
  product_type,
  material_composition,
  oeko_tex_certified,
  certipur_us_certified,
  fire_safety_standard,
  therapeutic_parameter
)
SELECT 
  id,
  'blue_light_glasses',
  '{"acetate_frame": 40, "polycarbonate_lens": 60}'::jsonb,
  false,
  false,
  'none',
  'Blocks 50% of blue light at 450nm, 90% at 400nm, minimal color distortion'
FROM new_product;

-- 20. Casper Original Hybrid Mattress
WITH new_product AS (
  INSERT INTO products (brand, name, category, status, price_usd, affiliate_url, affiliate_program, affiliate_commission_rate)
  VALUES (
    'Casper',
    'Original Hybrid Mattress (Queen)',
    'sleep',
    'active',
    1095.00,
    'https://www.casper.com/mattresses/original-hybrid/?campaignid=vyvata',
    'cj',
    6.00
  ) RETURNING id
)
INSERT INTO product_category_metadata (
  product_id,
  product_type,
  material_composition,
  oeko_tex_certified,
  certipur_us_certified,
  fire_safety_standard,
  therapeutic_parameter
)
SELECT 
  id,
  'mattress',
  '{"memory_foam": 25, "polyurethane_foam": 35, "pocketed_springs": 30, "cover_fabric": 10}'::jsonb,
  true,
  true,
  '16_cfr_1633',
  'Medium-firm (6/10), 11.5" height, zoned support for spine alignment'
FROM new_product;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count products by category
-- SELECT category, COUNT(*) as count 
-- FROM products 
-- GROUP BY category 
-- ORDER BY category;

-- View all wearables with metadata
-- SELECT p.brand, p.name, p.price_usd, m.sensor_type, m.battery_life_hours, m.claimed_accuracy
-- FROM products p
-- JOIN product_category_metadata m ON p.id = m.product_id
-- WHERE p.category = 'wearable';

-- View all diagnostics with biomarkers
-- SELECT p.brand, p.name, p.price_usd, m.biomarkers, m.lab_name, m.turnaround_time_days
-- FROM products p
-- JOIN product_category_metadata m ON p.id = m.product_id
-- WHERE p.category = 'diagnostic';
