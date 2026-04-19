// POST /api/admin/submissions/[id]/reject
// Terminal state. reviewer_notes is shown to the brand; required.

import type { NextRequest } from "next/server";
import { runReviewAction } from "../_shared";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return runReviewAction(req, ctx.params, "rejected");
}
