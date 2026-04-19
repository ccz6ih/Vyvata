// Rescore job — orchestrates full-catalog rescoring so new compliance flags
// and cert changes actually move public scores without manual admin clicks.
// Pure orchestrator: pulls data, calls scoreProduct(), writes product_scores.
// Used by /api/cron/rescore-products (weekly) and can be invoked manually
// from an admin endpoint.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  scoreProductDual,
  type ProductRow,
  type ProductIngredientRow,
  type CertificationRow,
  type ManufacturerRow,
  type ComplianceFlagRow,
  type ProductScore,
} from "@/lib/product-scoring";
import type { ScoreMode } from "@/lib/scoring/dimension-caps";

const SCORING_VERSION = "v1.0";

export interface RescoreResult {
  considered: number;
  rescored: number;
  skipped: number;
  tierChanges: Array<{
    productId: string;
    brand: string;
    name: string;
    previousTier: string | null;
    previousScore: number | null;
    newTier: string;
    newScore: number;
  }>;
  errors: Array<{ productId: string; error: string }>;
  ranAt: string;
}

/**
 * Rescore every active product, or a specific subset if productIds is given.
 * Inserts a new current product_scores row per product (the DB trigger flips
 * the prior current row's is_current=false, preserving history). Returns a
 * list of products whose tier changed — useful for alerting practitioners
 * and for the cron log.
 *
 * At current catalogue sizes (~70 products) we iterate in JS. For 1k+ products
 * we'd want a Postgres RPC to pre-filter candidates.
 */
export async function rescoreProducts(
  supabase: SupabaseClient,
  opts?: {
    productIds?: string[];
    reason?: "cron" | "compliance_flag_change" | "cert_change" | "manual";
  }
): Promise<RescoreResult> {
  const reason = opts?.reason ?? "cron";
  const result: RescoreResult = {
    considered: 0,
    rescored: 0,
    skipped: 0,
    tierChanges: [],
    errors: [],
    ranAt: new Date().toISOString(),
  };

  let query = supabase
    .from("products")
    .select("id, brand, name, manufacturer_id")
    .eq("status", "active");
  if (opts?.productIds && opts.productIds.length > 0) {
    query = query.in("id", opts.productIds);
  }
  const { data: products, error } = await query;
  if (error) {
    result.errors.push({ productId: "_fetch", error: error.message });
    return result;
  }

  const productList = (products ?? []) as unknown as ProductRow[];
  result.considered = productList.length;

  for (const product of productList) {
    try {
      // Pull everything the scorer needs + current scores (per mode) for
      // comparison. The product_scores.score_mode column gates the lookup so
      // each mode is compared independently.
      const [ingRes, certRes, mfrRes, flagsRes, currentRes] = await Promise.all([
        supabase
          .from("product_ingredients")
          .select("ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend")
          .eq("product_id", product.id),
        supabase
          .from("certifications")
          .select("type, verified")
          .eq("product_id", product.id),
        product.manufacturer_id
          ? supabase
              .from("manufacturers")
              .select("gmp_certified, fda_registered, third_party_tested")
              .eq("id", product.manufacturer_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("compliance_flags")
          .select("source, severity, issued_date")
          .is("resolved_at", null)
          .not("match_confidence", "eq", "unmatched")
          .or(
            product.manufacturer_id
              ? `matched_product_id.eq.${product.id},matched_manufacturer_id.eq.${product.manufacturer_id}`
              : `matched_product_id.eq.${product.id}`
          ),
        supabase
          .from("product_scores")
          .select("integrity_score, tier, score_mode")
          .eq("product_id", product.id)
          .eq("is_current", true),
      ]);

      const ingredients = (ingRes.data ?? []) as unknown as ProductIngredientRow[];
      const certifications = (certRes.data ?? []) as unknown as CertificationRow[];
      const manufacturer = (mfrRes.data ?? null) as unknown as ManufacturerRow | null;
      const complianceFlags = (flagsRes.data ?? []) as unknown as ComplianceFlagRow[];
      const currentByMode = new Map<ScoreMode, { integrity_score: number; tier: string }>();
      for (const row of (currentRes.data ?? []) as Array<{
        integrity_score: number;
        tier: string;
        score_mode: ScoreMode;
      }>) {
        currentByMode.set(row.score_mode, {
          integrity_score: row.integrity_score,
          tier: row.tier,
        });
      }

      // Phase 1 ships the AI-inferred path always. Verified mode will be
      // activated when an approved brand submission exists (Phase 3). Until
      // then the rescore writes a single ai_inferred row per product.
      const dual = scoreProductDual({
        product,
        ingredients,
        certifications,
        manufacturer,
        complianceFlags,
      });

      const writes: Array<{ mode: ScoreMode; score: ProductScore }> = [
        { mode: "ai_inferred", score: dual.ai_inferred },
      ];
      if (dual.verified) writes.push({ mode: "verified", score: dual.verified });

      for (const { mode, score } of writes) {
        const current = currentByMode.get(mode) ?? null;
        if (
          current &&
          current.integrity_score === score.integrity &&
          current.tier === score.tier
        ) {
          result.skipped += 1;
          continue;
        }

        const { error: insertErr } = await supabase.from("product_scores").insert({
          product_id: product.id,
          score_mode: mode,
          evidence_score: score.evidence,
          evidence_breakdown: score.breakdowns.evidence,
          safety_score: score.safety,
          safety_breakdown: score.breakdowns.safety,
          formulation_score: score.formulation,
          formulation_breakdown: score.breakdowns.formulation,
          manufacturing_score: score.manufacturing,
          manufacturing_breakdown: score.breakdowns.manufacturing,
          transparency_score: score.transparency,
          transparency_breakdown: score.breakdowns.transparency,
          sustainability_score: score.sustainability,
          integrity_score: score.integrity,
          tier: score.tier,
          version: SCORING_VERSION,
          scored_by: "system",
          rescore_reason: reason,
          is_current: true,
        });
        if (insertErr) throw insertErr;

        result.rescored += 1;

        // Only surface tier changes for ai_inferred — that's the public
        // surface practitioners react to. Verified-mode changes are driven
        // by brand submission review and will notify separately.
        if (mode === "ai_inferred" && current && current.tier !== score.tier) {
          result.tierChanges.push({
            productId: product.id,
            brand: product.brand,
            name: product.name,
            previousTier: current.tier,
            previousScore: current.integrity_score,
            newTier: score.tier,
            newScore: score.integrity,
          });
        }
      }
    } catch (err) {
      result.errors.push({
        productId: product.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
