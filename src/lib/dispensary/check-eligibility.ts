// Business logic for checking and updating practitioner dispensary eligibility.
//
// A product qualifies for the dispensary channel if ALL of these are true:
//   1. Has a verified score (score_mode='verified', is_current=true)
//   2. Verified integrity score >= 75
//   3. Manufacturer has an active commission agreement
//   4. Commission agreement has practitioner_channel_enabled = true
//   5. No active critical/high compliance flags on product or manufacturer
//
// This module is called by:
//   - approve-submission.ts (after writing verified score)
//   - Future: score recalculation jobs when scores change
//   - Future: commission agreement CRUD operations

import { getSupabaseServer } from "@/lib/supabase";

export interface EligibilityResult {
  isEligible: boolean;
  failReason: string | null;
  scoreAtCheck: number | null;
}

/**
 * Check if a product qualifies for the practitioner dispensary channel.
 * 
 * Uses the database function check_dispensary_eligibility() which encapsulates
 * all the business rules from the dispensary spec §2A.
 * 
 * @param productId - UUID of the product to check
 * @returns Eligibility status and reason if not eligible
 */
export async function checkDispensaryEligibility(
  productId: string
): Promise<EligibilityResult> {
  const supabase = getSupabaseServer();
  
  try {
    const { data, error } = await supabase.rpc("check_dispensary_eligibility", {
      p_product_id: productId,
    });

    if (error) {
      console.error("[checkDispensaryEligibility] RPC error:", error);
      throw new Error(`Failed to check eligibility: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // Should never happen - the function always returns one row
      throw new Error("No result from check_dispensary_eligibility");
    }

    const result = data[0] as {
      is_eligible: boolean;
      fail_reason: string | null;
      score_at_check: number | null;
    };

    return {
      isEligible: result.is_eligible,
      failReason: result.fail_reason,
      scoreAtCheck: result.score_at_check,
    };
  } catch (err) {
    console.error("[checkDispensaryEligibility] Unexpected error:", err);
    throw err;
  }
}

/**
 * Update the dispensary_eligible_products table for a product.
 * 
 * This is a materialized cache that tracks eligibility status. It's updated
 * atomically as part of transactions that change eligibility (e.g., approval
 * transactions, score recalculations, commission agreement changes).
 * 
 * @param productId - UUID of the product
 * @param eligibility - Result from checkDispensaryEligibility
 */
export async function updateDispensaryEligibility(
  productId: string,
  eligibility: EligibilityResult
): Promise<void> {
  const supabase = getSupabaseServer();
  
  const { error } = await supabase
    .from("dispensary_eligible_products")
    .upsert(
      {
        product_id: productId,
        is_eligible: eligibility.isEligible,
        eligibility_checked_at: new Date().toISOString(),
        score_at_check: eligibility.scoreAtCheck,
        fail_reason: eligibility.failReason,
      },
      { onConflict: "product_id" }
    );

  if (error) {
    console.error("[updateDispensaryEligibility] Upsert error:", error);
    throw new Error(`Failed to update eligibility cache: ${error.message}`);
  }
}

/**
 * Combined operation: check eligibility and update the cache.
 * 
 * This is the typical usage pattern - call this after any event that might
 * change eligibility (score changes, commission agreement changes, etc.).
 * 
 * @param productId - UUID of the product
 * @returns The eligibility result
 */
export async function checkAndUpdateDispensaryEligibility(
  productId: string
): Promise<EligibilityResult> {
  const eligibility = await checkDispensaryEligibility(productId);
  await updateDispensaryEligibility(productId, eligibility);
  return eligibility;
}

/**
 * Get eligibility status for multiple products (for admin dashboard).
 * 
 * @param manufacturerId - Optional: filter to products from this manufacturer
 * @returns Array of products with their eligibility status
 */
export async function getDispensaryEligibleProducts(manufacturerId?: string) {
  const supabase = getSupabaseServer();
  
  let query = supabase
    .from("dispensary_eligible_products")
    .select(`
      product_id,
      is_eligible,
      eligibility_checked_at,
      score_at_check,
      fail_reason,
      products!inner (
        id,
        brand,
        name,
        manufacturer_id,
        manufacturers!inner (
          id,
          name
        )
      )
    `)
    .order("eligibility_checked_at", { ascending: false });

  if (manufacturerId) {
    query = query.eq("products.manufacturer_id", manufacturerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getDispensaryEligibleProducts] Query error:", error);
    throw new Error(`Failed to fetch eligible products: ${error.message}`);
  }

  return data || [];
}
