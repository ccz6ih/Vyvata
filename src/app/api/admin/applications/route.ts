// GET /api/admin/applications
// Returns all practitioners, grouped by verification_status.
// Protected by the vv_admin_session cookie (set via /admin/login).

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("practitioners")
    .select(
      "id, name, email, credential, license_number, specialty, organization, " +
      "practice_type, practice_website, patient_volume, use_case, " +
      "verification_status, is_verified, is_active, " +
      "registered_at, verified_at, rejection_reason, tier, patient_count, last_login_at"
    )
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }

  // Cast to a known shape — Supabase client returns a loose union
  type PracRow = Record<string, unknown> & { verification_status: string };
  const rows = (data ?? []) as unknown as PracRow[];

  const pending  = rows.filter((p) => p.verification_status === "pending");
  const approved = rows.filter((p) => p.verification_status === "approved");
  const rejected = rows.filter((p) => p.verification_status === "rejected");

  return NextResponse.json({ pending, approved, rejected, all: rows });
}
