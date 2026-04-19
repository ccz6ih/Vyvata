// New submission wizard — server component that checks auth and redirects
// to the editor with a fresh draft.

import { redirect } from "next/navigation";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ product_id?: string }>;
}

export default async function NewSubmissionPage(props: PageProps) {
  const session = await getBrandSession();
  if (!session) redirect("/brand/login");

  if (session.account.status !== "active") {
    redirect("/brand/dashboard");
  }

  const searchParams = await props.searchParams;
  const productId = searchParams.product_id;

  // Create a new draft submission
  const supabase = getSupabaseServer();

  // If product_id provided, verify and pre-fill
  let productData: { brand: string; name: string } | null = null;
  if (productId) {
    const { data: product } = await supabase
      .from("products")
      .select("brand, name")
      .eq("id", productId)
      .maybeSingle();
    if (product) {
      productData = product as { brand: string; name: string };
    }
  }

  const { data: newSubmission, error } = await supabase
    .from("product_submissions")
    .insert({
      brand_account_id: session.account.id,
      product_id: productId ?? null,
      claimed_brand: productData?.brand ?? session.account.company_name,
      claimed_product_name: productData?.name ?? "",
      submission_data: {
        product_identity: {
          product_name: productData?.name ?? "",
          brand_name: productData?.brand ?? session.account.company_name,
          category: "",
          ingredients: [],
        },
        manufacturing_evidence: {
          nsf_sport: false,
          usp_verified: false,
          informed_sport: false,
          informed_choice: false,
          bscg_certified: false,
          non_gmo: false,
          organic_usda: false,
          vegan: false,
          gluten_free: false,
          kosher: false,
          halal: false,
          gmp_certified: false,
          fda_registered: false,
        },
        clinical_evidence: {
          clinical_study_urls: [],
        },
        safety_transparency: {},
      },
      file_references: [],
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !newSubmission) {
    console.error("[new submission] error:", error?.message);
    redirect("/brand/dashboard?error=create_failed");
  }

  redirect(`/brand/submissions/${(newSubmission as { id: string }).id}`);
}
