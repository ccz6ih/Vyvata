import { redirect } from "next/navigation";

// Legacy route — permanently redirect to new /protocol/[slug] path
export default async function ReceiptRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/protocol/${slug}`);
}
