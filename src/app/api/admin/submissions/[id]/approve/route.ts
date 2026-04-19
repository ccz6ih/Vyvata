// POST /api/admin/submissions/[id]/approve
// Execute the full approval transaction: transfer submission data to product
// catalog, write ingredients, certifications, trigger verified scoring, and
// update submission status. All-or-nothing atomic operation.

import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { approveSubmission } from "@/lib/submissions/approve-submission";

interface ApproveBody {
  reviewer_notes?: string;
  reviewer_email?: string;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as ApproveBody;

  // TODO: Extract reviewer email from admin session once that's formalized.
  // For now accept it from request body or default to a placeholder.
  const reviewerEmail = body.reviewer_email || "admin@vyvata.com";

  try {
    const result = await approveSubmission(id, reviewerEmail, {
      reviewerNotes: body.reviewer_notes,
    });

    return NextResponse.json({
      ok: true,
      product_id: result.productId,
      score_row_id: result.scoreRowId,
      was_new_product: result.wasNewProduct,
      message: result.wasNewProduct
        ? "Submission approved. New product created and scored in verified mode."
        : "Submission approved. Product updated and rescored in verified mode.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[approve-submission] Transaction failed:", message);
    
    return NextResponse.json(
      { 
        error: "Approval transaction failed", 
        details: message 
      },
      { status: 500 }
    );
  }
}
