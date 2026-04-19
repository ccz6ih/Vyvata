import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase";

const BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://vyvata.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = getSupabaseServer();

  // Public scorecards — one entry per active product with a slug.
  const { data } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active")
    .not("slug", "is", null);

  const productPages: MetadataRoute.Sitemap = (
    (data ?? []) as Array<{ slug: string; updated_at?: string | null }>
  ).map((p) => ({
    url: `${BASE}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/practitioner`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...productPages,
  ];
}
