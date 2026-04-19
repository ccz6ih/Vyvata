// GET /api/products/by-ingredient?name=Magnesium&limit=3
// Public lookup — no auth. Returns top-scored products that contain the
// requested ingredient (case-insensitive substring match on ingredient_name).
// Sorted by current integrity_score desc. Unscored products fall to the end.
//
// Used by the protocol page to show "here's what to buy" recommendations
// next to Missing and Working items.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

interface JoinedRow {
  id: string;
  brand: string;
  name: string;
  category: string;
  price_per_serving: number | null;
  product_url: string | null;
  product_ingredients: Array<{
    ingredient_name: string;
    dose: number;
    unit: string;
    form: string | null;
    bioavailability: string | null;
  }>;
  certifications: Array<{ type: string; verified: boolean }>;
  product_scores: Array<{ integrity_score: number; tier: string; is_current: boolean }>;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name")?.trim();
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "3", 10);
  const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 3), 10);

  if (!name) {
    return NextResponse.json({ error: "Missing ?name" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // Fetch products that have any ingredient whose name ilike-matches.
  // We select broadly then filter/rank in JS — product counts are small
  // enough that a single join + in-memory rank is simpler and cheaper than
  // an RPC. Revisit when catalogue exceeds ~10k products.
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, brand, name, category, price_per_serving, product_url,
      product_ingredients!inner (ingredient_name, dose, unit, form, bioavailability),
      certifications (type, verified),
      product_scores (integrity_score, tier, is_current)
    `)
    .eq("status", "active")
    .ilike("product_ingredients.ingredient_name", `%${name}%`)
    .limit(50);

  if (error) {
    console.error("by-ingredient error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as JoinedRow[];

  const ranked = rows
    .map((p) => {
      const current = p.product_scores?.find((s) => s.is_current) ?? null;
      const matched = p.product_ingredients.find((i) =>
        i.ingredient_name.toLowerCase().includes(name.toLowerCase())
      );
      return {
        id: p.id,
        brand: p.brand,
        name: p.name,
        category: p.category,
        price_per_serving: p.price_per_serving,
        product_url: p.product_url,
        matched_ingredient: matched ?? null,
        certifications: p.certifications?.filter((c) => c.verified).map((c) => c.type) ?? [],
        integrity_score: current?.integrity_score ?? null,
        tier: current?.tier ?? null,
      };
    })
    .sort((a, b) => {
      const as = a.integrity_score ?? -1;
      const bs = b.integrity_score ?? -1;
      if (as !== bs) return bs - as;
      return a.brand.localeCompare(b.brand);
    })
    .slice(0, limit);

  return NextResponse.json({
    ingredient: name,
    total: rows.length,
    products: ranked,
  });
}
