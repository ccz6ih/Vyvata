// Shared helper for admin submission review actions. All three endpoints
// (approve / reject / request-revision) share the same shape: validate
// the transition, update the row, and return the updated snapshot. The
// per-action routes just pass their target status.

import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";

type TerminalStatus = "approved" | "rejected" | "needs_revision";

// Which statuses are allowed to transition into each terminal status.
const ALLOWED_FROM: Record<TerminalStatus, string[]> = {
  approved: ["submitted", "reviewing"],
  rejected: ["submitted", "reviewing"],
  needs_revision: ["submitted", "reviewing"],
};

export interface ActionBody {
  reviewer_notes?: string | null;
}

export async function runReviewAction(
  req: NextRequest,
  params: Promise<{ id: string }>,
  target: TerminalStatus
): Promise<Response> {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as ActionBody;
  const reviewerNotes = body.reviewer_notes?.trim() || null;

  // Non-approval actions should carry a reason for the brand.
  if (target !== "approved" && !reviewerNotes) {
    return NextResponse.json(
      { error: `reviewer_notes required when ${target === "rejected" ? "rejecting" : "requesting revision"}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  const { data: current } = await supabase
    .from("product_submissions")
    .select("id, status, brand_account_id, product_id")
    .eq("id", id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const row = current as { id: string; status: string; brand_account_id: string; product_id: string | null };
  if (!ALLOWED_FROM[target].includes(row.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${row.status} to ${target}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("product_submissions")
    .update({
      status: target,
      decided_at: now,
      reviewer_notes: reviewerNotes,
      // Capture the reviewer who took the action when we have it.
      // Admin auth is session-cookie only right now; plug in admin email
      // here once we track the logged-in admin identity.
    })
    .eq("id", row.id)
    .select("id, status, decided_at, reviewer_notes, brand_account_id, product_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission: updated });
}
