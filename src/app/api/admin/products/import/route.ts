// POST /api/admin/products/import
// Idempotent bulk upsert for the product scraping agent. Accepts either a
// single product object or { products: [...] }. For each:
//   1. Upsert manufacturer by name (if provided) → manufacturer_id
//   2. Upsert product by (brand, name) UNIQUE
//   3. Replace product_ingredients (delete then bulk insert)
//   4. Replace certifications (delete then bulk insert)
//   5. Optionally run the VSF scorer on each (body.score === true)
//
// Returns { results: [...], errors: [...] } so a partial batch can still make
// progress. Admin-cookie gated.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const ManufacturerIn = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional().nullable(),
  country: z.string().max(60).optional().nullable(),
  gmp_certified: z.boolean().optional(),
  fda_registered: z.boolean().optional(),
  third_party_tested: z.boolean().optional(),
  nsf_gmp_url: z.string().url().optional().nullable(),
});

const IngredientIn = z.object({
  ingredient_name: z.string().min(1),
  dose: z.number().nonnegative(),
  unit: z.string().min(1).max(20),
  form: z.string().optional().nullable(),
  bioavailability: z.enum(["high", "medium", "low"]).optional().nullable(),
  daily_value_percentage: z.number().optional().nullable(),
  is_proprietary_blend: z.boolean().optional(),
  display_order: z.number().int().optional().nullable(),
});

const CertIn = z.object({
  type: z.enum([
    "nsf_sport", "nsf_gmp", "usp_verified", "informed_sport", "informed_choice",
    "non_gmo", "organic_usda", "vegan", "gluten_free", "kosher", "halal",
  ]),
  verified: z.boolean().optional(),
  verification_url: z.string().url().optional().nullable(),
  certificate_number: z.string().optional().nullable(),
  issued_date: z.string().optional().nullable(),       // ISO date
  expiration_date: z.string().optional().nullable(),   // ISO date
  notes: z.string().optional().nullable(),
});

const ProductIn = z.object({
  brand: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  product_url: z.string().url().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  serving_size: z.string().max(60).optional().nullable(),
  servings_per_container: z.number().int().positive().optional().nullable(),
  price_usd: z.number().nonnegative().optional().nullable(),
  status: z.enum(["active", "discontinued", "pending_review"]).optional(),
  manufacturer: ManufacturerIn.optional().nullable(),
  ingredients: z.array(IngredientIn).default([]),
  certifications: z.array(CertIn).default([]),
});

const BodySchema = z.union([
  z.object({ products: z.array(ProductIn).min(1).max(500), score: z.boolean().optional() }),
  ProductIn.extend({ score: z.boolean().optional() }),
]);

type Result = {
  brand: string;
  name: string;
  product_id?: string;
  action: "created" | "updated";
  scored?: { integrity: number; tier: string };
};

export async function POST(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 }
    );
  }

  const items: Array<z.infer<typeof ProductIn>> =
    "products" in parsed.data ? parsed.data.products : [parsed.data];
  const wantScore = parsed.data.score === true;

  const supabase = getSupabaseServer();
  const results: Result[] = [];
  const errors: Array<{ brand: string; name: string; error: string }> = [];

  for (const item of items) {
    try {
      const row = await upsertProduct(supabase, item);
      const result: Result = {
        brand: item.brand,
        name: item.name,
        product_id: row.id,
        action: row.created ? "created" : "updated",
      };

      if (wantScore) {
        const s = await rescore(supabase, row.id);
        if (s) result.scored = { integrity: s.integrity, tier: s.tier };
      }

      results.push(result);
    } catch (err) {
      errors.push({
        brand: item.brand,
        name: item.name,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    counts: { total: items.length, created: results.filter(r => r.action === "created").length, updated: results.filter(r => r.action === "updated").length, errors: errors.length },
    results,
    errors,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsertProduct(
  supabase: ReturnType<typeof getSupabaseServer>,
  input: z.infer<typeof ProductIn>
): Promise<{ id: string; created: boolean }> {
  let manufacturerId: string | null = null;
  if (input.manufacturer) {
    const { data: existingMfr } = await supabase
      .from("manufacturers")
      .select("id")
      .eq("name", input.manufacturer.name)
      .maybeSingle();

    if (existingMfr) {
      manufacturerId = (existingMfr as { id: string }).id;
      await supabase
        .from("manufacturers")
        .update({
          website: input.manufacturer.website ?? undefined,
          country: input.manufacturer.country ?? undefined,
          gmp_certified: input.manufacturer.gmp_certified ?? undefined,
          fda_registered: input.manufacturer.fda_registered ?? undefined,
          third_party_tested: input.manufacturer.third_party_tested ?? undefined,
          nsf_gmp_url: input.manufacturer.nsf_gmp_url ?? undefined,
        })
        .eq("id", manufacturerId);
    } else {
      const { data: newMfr, error } = await supabase
        .from("manufacturers")
        .insert({
          name: input.manufacturer.name,
          website: input.manufacturer.website ?? null,
          country: input.manufacturer.country ?? null,
          gmp_certified: input.manufacturer.gmp_certified ?? false,
          fda_registered: input.manufacturer.fda_registered ?? false,
          third_party_tested: input.manufacturer.third_party_tested ?? false,
          nsf_gmp_url: input.manufacturer.nsf_gmp_url ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`manufacturer insert: ${error.message}`);
      manufacturerId = (newMfr as { id: string }).id;
    }
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("brand", input.brand)
    .eq("name", input.name)
    .maybeSingle();

  let productId: string;
  let created = false;

  const productFields = {
    brand: input.brand,
    name: input.name,
    category: input.category,
    product_url: input.product_url ?? null,
    image_url: input.image_url ?? null,
    serving_size: input.serving_size ?? null,
    servings_per_container: input.servings_per_container ?? null,
    price_usd: input.price_usd ?? null,
    status: input.status ?? "active",
    manufacturer_id: manufacturerId,
  };

  if (existing) {
    productId = (existing as { id: string }).id;
    const { error } = await supabase.from("products").update(productFields).eq("id", productId);
    if (error) throw new Error(`product update: ${error.message}`);
  } else {
    const { data: newP, error } = await supabase
      .from("products")
      .insert(productFields)
      .select("id")
      .single();
    if (error) throw new Error(`product insert: ${error.message}`);
    productId = (newP as { id: string }).id;
    created = true;
  }

  // Replace ingredients
  await supabase.from("product_ingredients").delete().eq("product_id", productId);
  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((i, idx) => ({
      product_id: productId,
      ingredient_name: i.ingredient_name,
      dose: i.dose,
      unit: i.unit,
      form: i.form ?? null,
      bioavailability: i.bioavailability ?? null,
      daily_value_percentage: i.daily_value_percentage ?? null,
      is_proprietary_blend: i.is_proprietary_blend ?? false,
      display_order: i.display_order ?? idx,
    }));
    const { error } = await supabase.from("product_ingredients").insert(rows);
    if (error) throw new Error(`ingredients insert: ${error.message}`);
  }

  // Replace certifications
  await supabase.from("certifications").delete().eq("product_id", productId);
  if (input.certifications.length > 0) {
    const rows = input.certifications.map((c) => ({
      product_id: productId,
      type: c.type,
      verified: c.verified ?? false,
      verification_url: c.verification_url ?? null,
      certificate_number: c.certificate_number ?? null,
      issued_date: c.issued_date ?? null,
      expiration_date: c.expiration_date ?? null,
      notes: c.notes ?? null,
    }));
    const { error } = await supabase.from("certifications").insert(rows);
    if (error) throw new Error(`certifications insert: ${error.message}`);
  }

  return { id: productId, created };
}

async function rescore(
  supabase: ReturnType<typeof getSupabaseServer>,
  productId: string
): Promise<{ integrity: number; tier: string } | null> {
  const { data: productRaw } = await supabase
    .from("products")
    .select("id, brand, name, manufacturer_id")
    .eq("id", productId)
    .single();
  if (!productRaw) return null;
  const product = productRaw as unknown as ProductRow;

  const [ingRes, certRes, mfrRes, flagsRes] = await Promise.all([
    supabase.from("product_ingredients").select("ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend").eq("product_id", productId),
    supabase.from("certifications").select("type, verified").eq("product_id", productId),
    product.manufacturer_id
      ? supabase.from("manufacturers").select("gmp_certified, fda_registered, third_party_tested").eq("id", product.manufacturer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("compliance_flags")
      .select("source, severity, issued_date")
      .is("resolved_at", null)
      .or(
        product.manufacturer_id
          ? `matched_product_id.eq.${productId},matched_manufacturer_id.eq.${product.manufacturer_id}`
          : `matched_product_id.eq.${productId}`
      ),
  ]);

  const s = scoreProduct({
    product,
    ingredients: (ingRes.data ?? []) as unknown as ProductIngredientRow[],
    certifications: (certRes.data ?? []) as unknown as CertificationRow[],
    manufacturer: (mfrRes.data ?? null) as unknown as ManufacturerRow | null,
    complianceFlags: (flagsRes.data ?? []) as unknown as ComplianceFlagRow[],
  });

  await supabase.from("product_scores").insert({
    product_id: productId,
    evidence_score: s.evidence,
    evidence_breakdown: s.breakdowns.evidence,
    safety_score: s.safety,
    safety_breakdown: s.breakdowns.safety,
    formulation_score: s.formulation,
    formulation_breakdown: s.breakdowns.formulation,
    manufacturing_score: s.manufacturing,
    manufacturing_breakdown: s.breakdowns.manufacturing,
    transparency_score: s.transparency,
    transparency_breakdown: s.breakdowns.transparency,
    sustainability_score: s.sustainability,
    integrity_score: s.integrity,
    tier: s.tier,
    version: SCORING_VERSION,
    scored_by: "system",
    is_current: true,
  });

  return { integrity: s.integrity, tier: s.tier };
}
