// POST /api/brand/submissions/[id]/submit
// Transition a draft → submitted for review

import { NextRequest, NextResponse } from "next/server";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";
import { SubmissionDataSchema } from "@/lib/brand-submission/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.account.status !== "active") {
    return NextResponse.json(
      { error: "Account not approved for submissions" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const supabase = getSupabaseServer();

  const { data: submission } = await supabase
    .from("product_submissions")
    .select("id, status, submission_data, brand_account_id")
    .eq("id", id)
    .eq("brand_account_id", session.account.id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["draft", "needs_revision"].includes(submission.status)) {
    return NextResponse.json(
      { error: "Can only submit drafts or needs_revision submissions" },
      { status: 403 }
    );
  }

  // Validate submission_data
  const validationResult = SubmissionDataSchema.safeParse(
    submission.submission_data
  );
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Submission data incomplete or invalid",
        details: validationResult.error.format(),
      },
      { status: 400 }
    );
  }

  // Check required fields
  const data = validationResult.data;
  if (!data.product_identity.product_name) {
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 }
    );
  }
  if (data.product_identity.ingredients.length === 0) {
    return NextResponse.json(
      { error: "At least one ingredient is required" },
      { status: 400 }
    );
  }

  // Transition to submitted
  const { error } = await supabase
    .from("product_submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[POST /api/brand/submissions/[id]/submit] error:", error.message);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }

  // TODO: Send Resend notification to admin
  // TODO: Send confirmation to brand

  return NextResponse.json({ ok: true });
}
