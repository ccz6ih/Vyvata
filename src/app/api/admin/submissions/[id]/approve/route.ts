// POST /api/admin/submissions/[id]/approve
// Transitions submission to approved. Phase 3b wires the follow-on
// rescore trigger (product gets a verified-mode score row) + brand
// notification email; for now the write is all we do.

import type { NextRequest } from "next/server";
import { runReviewAction } from "../_shared";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return runReviewAction(req, ctx.params, "approved");
}
