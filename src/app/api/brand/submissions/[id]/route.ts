// GET    /api/brand/submissions/[id]  — get submission details
// PATCH  /api/brand/submissions/[id]  — save draft
// DELETE /api/brand/submissions/[id]  — delete draft

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";
import { SubmissionDataSchema } from "@/lib/brand-submission/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getOwnSubmission(brandAccountId: string, submissionId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("product_submissions")
    .select(`
      id, brand_account_id, product_id, status,
      claimed_brand, claimed_product_name, claimed_sku,
      submission_data, file_references,
      submitted_at, review_started_at, decided_at,
      reviewer_email, reviewer_notes,
      created_at, updated_at,
      product:products!product_id (id, slug, brand, name, category, serving_size, servings_per_container)
    `)
    .eq("id", submissionId)
    .eq("brand_account_id", brandAccountId)
    .maybeSingle();

  if (error) {
    console.error("[getOwnSubmission] error:", error.message);
    return null;
  }
  return data;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const submission = await getOwnSubmission(session.account.id, id);
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ submission });
}

const UpdateSchema = z.object({
  submission_data: SubmissionDataSchema.optional(),
  claimed_brand: z.string().optional(),
  claimed_product_name: z.string().optional(),
  claimed_sku: z.string().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const submission = await getOwnSubmission(session.account.id, id);
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Can only edit drafts or needs_revision submissions
  if (!["draft", "needs_revision"].includes(submission.status)) {
    return NextResponse.json(
      { error: "Cannot edit submitted or decided submissions" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();
  const updates: Record<string, unknown> = {};
  if (parsed.data.submission_data !== undefined) {
    updates.submission_data = parsed.data.submission_data;
  }
  if (parsed.data.claimed_brand !== undefined) {
    updates.claimed_brand = parsed.data.claimed_brand;
  }
  if (parsed.data.claimed_product_name !== undefined) {
    updates.claimed_product_name = parsed.data.claimed_product_name;
  }
  if (parsed.data.claimed_sku !== undefined) {
    updates.claimed_sku = parsed.data.claimed_sku;
  }

  const { error } = await supabase
    .from("product_submissions")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[PATCH /api/brand/submissions/[id]] error:", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const submission = await getOwnSubmission(session.account.id, id);
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Can only delete drafts
  if (submission.status !== "draft") {
    return NextResponse.json(
      { error: "Can only delete draft submissions" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("product_submissions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/brand/submissions/[id]] error:", error.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
