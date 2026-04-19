// POST /api/admin/submissions/[id]/request-revision
// Sends the submission back to the brand for edits. reviewer_notes
// describes what's needed; required.

import type { NextRequest } from "next/server";
import { runReviewAction } from "../_shared";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return runReviewAction(req, ctx.params, "needs_revision");
}
