// GET  /api/brand/submissions  — list own submissions
// POST /api/brand/submissions  — create new draft

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";
import { emptySubmissionData } from "@/lib/brand-submission/schemas";

const CreateSchema = z.object({
  product_id: z.string().uuid().optional(), // Link to existing product
  claimed_brand: z.string().optional(),
  claimed_product_name: z.string().optional(),
  claimed_sku: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("product_submissions")
    .select(`
      id, status, claimed_brand, claimed_product_name, claimed_sku,
      submitted_at, decided_at, reviewer_notes, created_at, updated_at,
      product:products!product_id (id, slug, brand, name)
    `)
    .eq("brand_account_id", session.account.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/brand/submissions] error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.account.status !== "active") {
    return NextResponse.json(
      { error: "Account not approved yet" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  // If product_id provided, verify it exists and pre-fill claimed fields
  let productData: { brand: string; name: string } | null = null;
  if (parsed.data.product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("brand, name")
      .eq("id", parsed.data.product_id)
      .maybeSingle();
    if (product) {
      productData = product as { brand: string; name: string };
    }
  }

  const { data: submission, error } = await supabase
    .from("product_submissions")
    .insert({
      brand_account_id: session.account.id,
      product_id: parsed.data.product_id ?? null,
      claimed_brand:
        parsed.data.claimed_brand ?? productData?.brand ?? session.account.company_name,
      claimed_product_name:
        parsed.data.claimed_product_name ?? productData?.name ?? "",
      claimed_sku: parsed.data.claimed_sku ?? null,
      submission_data: emptySubmissionData(),
      file_references: [],
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[POST /api/brand/submissions] error:", error.message);
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }

  return NextResponse.json({ submission }, { status: 201 });
}
