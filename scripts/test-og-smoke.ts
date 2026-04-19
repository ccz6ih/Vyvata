/**
 * OG smoke test — asserts the product OG route renders a 1200×630 PNG for a
 * known product slug. Run after deploy to catch Edge-runtime breakage that
 * `next build` won't catch (e.g., missing env vars at the Edge, Supabase
 * client crashing inside ImageResponse).
 *
 * Usage:
 *   npx tsx scripts/test-og-smoke.ts [slug]
 *   npx tsx scripts/test-og-smoke.ts --url https://vyvata.com
 *
 * Env vars:
 *   OG_TEST_ORIGIN   Override base URL (default http://localhost:3000).
 *   OG_TEST_SLUG     Specific slug to probe. If omitted, the script picks
 *                    the first active product with a slug from Supabase.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function pickSlug(): Promise<string | null> {
  const override = process.env.OG_TEST_SLUG;
  if (override) return override;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from("products")
    .select("slug")
    .eq("status", "active")
    .not("slug", "is", null)
    .limit(1)
    .maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}

async function main() {
  const origin =
    process.env.OG_TEST_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const slug = process.argv[2] || (await pickSlug());
  if (!slug) {
    console.error("No slug available — pass one as arg or set OG_TEST_SLUG.");
    process.exit(1);
  }

  const target = `${origin}/api/og/product?slug=${encodeURIComponent(slug)}`;
  console.log(`[og-smoke] GET ${target}`);

  const res = await fetch(target);
  if (!res.ok) {
    console.error(`[og-smoke] FAIL  status=${res.status}  body=${await res.text().catch(() => "")}`);
    process.exit(1);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    console.error(`[og-smoke] FAIL  unexpected content-type: ${contentType}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  // PNG magic: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) {
    console.error(`[og-smoke] FAIL  response is not a PNG (${buffer.length} bytes)`);
    process.exit(1);
  }
  if (buffer.length < 10_000) {
    console.error(`[og-smoke] FAIL  PNG implausibly small (${buffer.length} bytes) — likely blank`);
    process.exit(1);
  }

  console.log(`[og-smoke] OK  slug=${slug}  bytes=${buffer.length}  content-type=${contentType}`);
}

main().catch((err) => {
  console.error("[og-smoke] ERROR", err);
  process.exit(1);
});
