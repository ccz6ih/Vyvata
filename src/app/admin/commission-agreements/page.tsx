// Admin commission agreements page - server component that lists all
// manufacturers with their dispensary program status.

import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";
import AdminCommissionAgreementsClient from "./AdminCommissionAgreementsClient";

export const dynamic = "force-dynamic";

export interface ManufacturerRow {
  id: string;
  name: string;
  website: string | null;
  gmp_certified: boolean;
  fda_registered: boolean;
  third_party_tested: boolean;
  agreements: Array<{
    id: string;
    consumer_rate: number;
    practitioner_rate: number;
    elite_rate: number;
    status: string;
    practitioner_channel_enabled: boolean;
    effective_date: string;
    termination_date: string | null;
    created_by: string | null;
    notes: string | null;
    created_at: string;
  }> | null;
  brand_accounts: Array<{
    id: string;
    email: string;
    company_name: string;
    status: string;
  }> | null;
  product_count?: number;
  eligible_product_count?: number;
}

export default async function AdminCommissionAgreementsPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");

  const supabase = getSupabaseServer();
  
  // Get all manufacturers with their agreements and brand accounts
  const { data: manufacturers, error } = await supabase
    .from("manufacturers")
    .select(`
      id,
      name,
      website,
      gmp_certified,
      fda_registered,
      third_party_tested,
      agreements:commission_agreements (
        id,
        consumer_rate,
        practitioner_rate,
        elite_rate,
        status,
        practitioner_channel_enabled,
        effective_date,
        termination_date,
        created_by,
        notes,
        created_at
      ),
      brand_accounts (
        id,
        email,
        company_name,
        status
      )
    `)
    .order("name", { ascending: true });

  if (error) {
    console.error("[AdminCommissionAgreements] fetch error:", error);
  }

  // Get product counts per manufacturer
  const { data: productCounts } = await supabase
    .from("products")
    .select("manufacturer_id")
    .not("manufacturer_id", "is", null);

  // Get eligible product counts
  const { data: eligibleCounts } = await supabase
    .from("dispensary_eligible_products")
    .select("product_id, products!inner(manufacturer_id)")
    .eq("is_eligible", true);

  // Map counts to manufacturers
  const manufacturersWithCounts = (manufacturers || []).map((m) => {
    const row = m as ManufacturerRow;
    row.product_count = (productCounts || []).filter(
      (p) => (p as { manufacturer_id: string | null }).manufacturer_id === row.id
    ).length;
    row.eligible_product_count = (eligibleCounts || []).filter(
      (e) => {
        // PostgREST returns the joined relation as either a single object
        // or an array depending on the FK direction; handle both.
        const raw = (e as { products: { manufacturer_id: string | null } | { manufacturer_id: string | null }[] | null }).products;
        const product = Array.isArray(raw) ? raw[0] ?? null : raw;
        return product?.manufacturer_id === row.id;
      }
    ).length;
    return row;
  });

  return <AdminCommissionAgreementsClient manufacturers={manufacturersWithCounts} />;
}
