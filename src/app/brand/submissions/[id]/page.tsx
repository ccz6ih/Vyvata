// View/edit a specific submission. Server component fetches data, client
// component handles the multi-step form.

import { redirect } from "next/navigation";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";
import SubmissionEditor from "./SubmissionEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionDetailPage(props: PageProps) {
  const session = await getBrandSession();
  if (!session) redirect("/brand/login");

  const { id } = await props.params;
  const supabase = getSupabaseServer();

  const { data: submission } = await supabase
    .from("product_submissions")
    .select(`
      id, status, claimed_brand, claimed_product_name, claimed_sku,
      submission_data, file_references,
      submitted_at, decided_at, reviewer_notes,
      created_at, updated_at,
      product:products!product_id (id, slug, brand, name, category)
    `)
    .eq("id", id)
    .eq("brand_account_id", session.account.id)
    .maybeSingle();

  if (!submission) {
    redirect("/brand/dashboard?error=not_found");
  }

  // PostgREST returns joined relations as arrays even when the relation
  // is one-to-one. SubmissionEditor expects a single `product` object or
  // null, so flatten here before passing down.
  type RelatedProduct = { id: string; slug: string; brand: string; name: string; category: string };
  const rawProduct = (submission as { product?: RelatedProduct | RelatedProduct[] | null }).product;
  const product: RelatedProduct | null = Array.isArray(rawProduct)
    ? rawProduct[0] ?? null
    : rawProduct ?? null;

  return <SubmissionEditor submission={{ ...submission, product }} />;
}
