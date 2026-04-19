// GET /api/admin/compliance/search?q=thorne
// Typeahead for the manual-match modal. Returns matching manufacturers +
// products (ILIKE) so an admin can attach an unmatched flag to the right
// entity.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ manufacturers: [], products: [] });

  const supabase = getSupabaseServer();
  const needle = `%${q}%`;

  const [mfrRes, prodRes] = await Promise.all([
    supabase.from("manufacturers").select("id, name, country").ilike("name", needle).limit(10),
    supabase
      .from("products")
      .select("id, brand, name, category, manufacturer_id")
      .or(`brand.ilike.${needle},name.ilike.${needle}`)
      .limit(10),
  ]);

  return NextResponse.json({
    manufacturers: mfrRes.data ?? [],
    products: prodRes.data ?? [],
  });
}
