/**
 * Direct database import for auto-import script
 * Bypasses API auth by using service role key
 */

import { createClient } from '@supabase/supabase-js';
import { scoreProduct, type ProductRow, type ProductIngredientRow, type CertificationRow } from '../src/lib/product-scoring';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ImportProduct {
  brand: string;
  name: string;
  category: string;
  serving_size?: string;
  servings_per_container?: number;
  status: 'active' | 'discontinued';
  ingredients: Array<{
    ingredient_name: string;
    dose: number;
    unit: string;
    form?: string;
    bioavailability?: 'high' | 'medium' | 'low';
    display_order?: number;
  }>;
  certifications: Array<{
    type: string;
    verified: boolean;
    verification_date?: string;
  }>;
}

export async function importProductsDirectly(
  products: ImportProduct[],
  options: { autoScore?: boolean } = {}
): Promise<{
  ok: boolean;
  counts: { created: number; updated: number; errors: number };
  results: any[];
  errors: any[];
}> {
  const results: any[] = [];
  const errors: any[] = [];
  let created = 0;
  let updated = 0;

  for (const productData of products) {
    try {
      // 1. Upsert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .upsert(
          {
            brand: productData.brand,
            name: productData.name,
            category: productData.category,
            serving_size: productData.serving_size,
            servings_per_container: productData.servings_per_container,
            status: productData.status,
          },
          {
            onConflict: 'brand,name',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (productError) throw new Error(`Product upsert failed: ${productError.message}`);
      if (!product) throw new Error('Product upsert returned no data');

      const isNew = !product.created_at || new Date(product.created_at).getTime() > Date.now() - 5000;
      if (isNew) created++;
      else updated++;

      // 2. Delete existing ingredients (for idempotent replace)
      await supabase
        .from('product_ingredients')
        .delete()
        .eq('product_id', product.id);

      // 3. Insert ingredients
      if (productData.ingredients.length > 0) {
        const ingredientsToInsert = productData.ingredients.map((ing, idx) => ({
          product_id: product.id,
          ingredient_name: ing.ingredient_name,
          dose: ing.dose,
          unit: ing.unit,
          form: ing.form || null,
          bioavailability: ing.bioavailability || 'medium',
          display_order: ing.display_order ?? idx + 1,
        }));

        const { error: ingredientsError } = await supabase
          .from('product_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          throw new Error(`Ingredients insert failed: ${ingredientsError.message}`);
        }
      }

      // 4. Delete existing certifications (for idempotent replace)
      await supabase
        .from('certifications')
        .delete()
        .eq('product_id', product.id);

      // 5. Insert certifications
      if (productData.certifications.length > 0) {
        const certificationsToInsert = productData.certifications.map((cert) => ({
          product_id: product.id,
          type: cert.type,
          verified: cert.verified,
          verification_date: cert.verification_date || new Date().toISOString(),
        }));

        const { error: certsError } = await supabase
          .from('certifications')
          .insert(certificationsToInsert);

        if (certsError) {
          throw new Error(`Certifications insert failed: ${certsError.message}`);
        }
      }

      // 6. Auto-score if requested
      let scoreResult = null;
      if (options.autoScore) {
        try {
          // Fetch complete product data for scoring
          const { data: fullProduct } = await supabase
            .from('products')
            .select(`
              *,
              product_ingredients (*),
              certifications (*)
            `)
            .eq('id', product.id)
            .single();

          if (fullProduct) {
            scoreResult = await scoreProduct(fullProduct as any, supabase);
          }
        } catch (scoreError: any) {
          console.warn(`Warning: Scoring failed for ${productData.brand} ${productData.name}:`, scoreError.message);
        }
      }

      results.push({
        brand: productData.brand,
        name: productData.name,
        product_id: product.id,
        action: isNew ? 'created' : 'updated',
        scored: scoreResult,
      });

    } catch (error: any) {
      console.error(`Error importing ${productData.brand} ${productData.name}:`, error.message);
      errors.push({
        brand: productData.brand,
        name: productData.name,
        error: error.message,
      });
    }
  }

  return {
    ok: true,
    counts: { created, updated, errors: errors.length },
    results,
    errors,
  };
}
