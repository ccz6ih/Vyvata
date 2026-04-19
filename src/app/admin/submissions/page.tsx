// Admin submissions queue. Server component that lists every non-draft
// product_submissions row with the pending ones first. Per-submission
// approve/reject/request-revision actions live in
// AdminSubmissionsClient.tsx (client, fires at the /api/admin/submissions
// endpoints).

import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";
import AdminSubmissionsClient, { type SubmissionRow } from "./AdminSubmissionsClient";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");

  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("product_submissions")
    .select(`
      id, status, submitted_at, review_started_at, decided_at, reviewer_notes,
      claimed_brand, claimed_product_name, claimed_sku,
      submission_data, file_references,
      created_at, updated_at,
      brand:brand_accounts!brand_account_id (id, email, company_name, status),
      product:products!product_id (id, slug, brand, name)
    `)
    .neq("status", "draft")
    .order("status", { ascending: true })
    .order("submitted_at", { ascending: false, nullsFirst: false });

  const rows = (data ?? []) as unknown as SubmissionRow[];

  return <AdminSubmissionsClient rows={rows} />;
}
