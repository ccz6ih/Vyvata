// GET /api/admin/products
// Lists all products with their current VSF score (if scored).
// Admin-cookie gated.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, brand, name, category, status, price_usd, price_per_serving,
      manufacturer_id,
      product_ingredients (id, ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend),
      certifications (id, type, verified, expiration_date),
      product_scores (id, integrity_score, tier, is_current, scored_at, version)
    `)
    .order("brand", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("admin/products list error:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }

  // Narrow product_scores to the current row only, for a simpler client contract.
  type ScoreRow = { id: string; integrity_score: number; tier: string; is_current: boolean; scored_at: string; version: string };
  type Row = Record<string, unknown> & { product_scores: ScoreRow[] };
  const rows = (products ?? []) as unknown as Row[];
  const withCurrent = rows.map((p) => {
    const current = p.product_scores?.find((s) => s.is_current) ?? null;
    return { ...p, current_score: current };
  });

  return NextResponse.json({ products: withCurrent });
}
