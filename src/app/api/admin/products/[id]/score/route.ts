// POST /api/admin/products/[id]/score
// Pulls the product + ingredients + certifications + manufacturer, runs the
// VSF scoring engine, and writes the result to product_scores with is_current=true.
// The DB trigger ensure_single_current_score flips any prior current row to false.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";
import {
  scoreProduct,
  type ProductRow,
  type ProductIngredientRow,
  type CertificationRow,
  type ManufacturerRow,
  type ComplianceFlagRow,
} from "@/lib/product-scoring";

const SCORING_VERSION = "v1.0";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data: productRaw, error: productErr } = await supabase
    .from("products")
    .select("id, brand, name, manufacturer_id")
    .eq("id", id)
    .single();

  if (productErr || !productRaw) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const product = productRaw as unknown as ProductRow;

  const [ingredientsRes, certsRes, manufacturerRes, flagsRes] = await Promise.all([
    supabase
      .from("product_ingredients")
      .select("ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend")
      .eq("product_id", id),
    supabase
      .from("certifications")
      .select("type, verified")
      .eq("product_id", id),
    product.manufacturer_id
      ? supabase
          .from("manufacturers")
          .select("gmp_certified, fda_registered, third_party_tested")
          .eq("id", product.manufacturer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("compliance_flags")
      .select("source, severity, issued_date")
      .is("resolved_at", null)
      .or(
        product.manufacturer_id
          ? `matched_product_id.eq.${id},matched_manufacturer_id.eq.${product.manufacturer_id}`
          : `matched_product_id.eq.${id}`
      ),
  ]);

  if (ingredientsRes.error) return NextResponse.json({ error: "Ingredients fetch failed" }, { status: 500 });
  if (certsRes.error)       return NextResponse.json({ error: "Certifications fetch failed" }, { status: 500 });

  const ingredients = (ingredientsRes.data ?? []) as unknown as ProductIngredientRow[];
  const certifications = (certsRes.data ?? []) as unknown as CertificationRow[];
  const manufacturer = (manufacturerRes.data ?? null) as unknown as ManufacturerRow | null;
  const complianceFlags = (flagsRes.data ?? []) as unknown as ComplianceFlagRow[];

  const score = scoreProduct({ product, ingredients, certifications, manufacturer, complianceFlags });

  const { error: insertErr, data: inserted } = await supabase
    .from("product_scores")
    .insert({
      product_id: id,
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
      is_current: true,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("score insert error:", insertErr);
    return NextResponse.json({ error: "Failed to persist score" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    product: { id: product.id, brand: product.brand, name: product.name },
    score,
    row_id: (inserted as { id: string } | null)?.id ?? null,
  });
}
