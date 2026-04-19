/**
 * OG smoke test — asserts the product OG route renders a real PNG for
 * representative products across every tier. Built after the tier-pill
 * Satori crash (2026-04-19): a specific style combo in the scored branch
 * returned 200 OK with Content-Length: 0, passed `next build` cleanly, and
 * only showed up when Facebook tried to scrape. This script is the CI
 * gate that catches that class of silent-render failure.
 *
 * What it checks per probe:
 *   - HTTP 200 OK
 *   - content-type starts with image/
 *   - PNG magic bytes at the start of the body
 *   - Body size >= 10_000 bytes (empirical floor; a real card is 50-70KB,
 *     a silent crash is 0 bytes, there's no middle ground)
 *
 * Probe selection:
 *   1. One product per tier (elite / verified / standard / rejected) where
 *      available — each tier exercises a different TIER_COLOR code path
 *   2. One known-unscored slug (the fallback branch)
 *
 * Usage:
 *   npx tsx scripts/test-og-smoke.ts              # hits NEXT_PUBLIC_APP_URL
 *   OG_TEST_ORIGIN=https://preview-xyz.vercel.app npx tsx scripts/test-og-smoke.ts
 *   npx tsx scripts/test-og-smoke.ts <slug>       # single-slug mode
 *
 * Env vars:
 *   OG_TEST_ORIGIN   Base URL to probe. Defaults to NEXT_PUBLIC_APP_URL,
 *                    else https://vyvata.com. Never defaults to localhost —
 *                    post-deploy smoke should hit the deployed origin.
 */

// dotenv/config only reads `.env` by default; Next projects keep their
// Supabase keys in `.env.local`, so load that explicitly.
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig(); // then .env as a fallback, without overriding .env.local
import { createClient } from "@supabase/supabase-js";

const MIN_BYTES = 10_000;

type Tier = "elite" | "verified" | "standard" | "rejected";

interface Probe {
  label: string;
  slug: string;
  expectScored: boolean;
}

async function pickProbes(singleSlug?: string): Promise<Probe[]> {
  if (singleSlug) {
    return [{ label: "user-provided", slug: singleSlug, expectScored: true }];
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL + a key to auto-pick slugs.");
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // One product per tier. Using inner join on product_scores so we only get
  // active products that actually have a current score — the fragile path
  // we care about smoke-testing.
  const probes: Probe[] = [];
  const tiers: Tier[] = ["elite", "verified", "standard", "rejected"];
  for (const tier of tiers) {
    const { data } = await sb
      .from("products")
      .select("slug, product_scores!inner(tier, is_current)")
      .eq("status", "active")
      .eq("product_scores.is_current", true)
      .eq("product_scores.tier", tier)
      .not("slug", "is", null)
      .limit(1);
    const row = (data ?? [])[0] as { slug: string } | undefined;
    if (row?.slug) probes.push({ label: `tier:${tier}`, slug: row.slug, expectScored: true });
  }

  // Fallback-path probe: a slug we know doesn't exist. Exercises the
  // "Not yet scored" render branch independently of real data.
  probes.push({
    label: "fallback:no-such-product",
    slug: `__smoke__${Date.now()}`,
    expectScored: false,
  });

  if (probes.length === 1) {
    throw new Error("No scored products found — catalog may be empty.");
  }
  return probes;
}

async function probe(origin: string, p: Probe): Promise<{ ok: boolean; msg: string }> {
  const target = `${origin}/api/og/product?slug=${encodeURIComponent(p.slug)}`;
  const res = await fetch(target, { cache: "no-store" });
  if (!res.ok) {
    return { ok: false, msg: `status=${res.status}` };
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, msg: `content-type=${contentType}` };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) {
    return { ok: false, msg: `not-a-png size=${buffer.length}` };
  }
  if (buffer.length < MIN_BYTES) {
    return { ok: false, msg: `too-small size=${buffer.length} (min ${MIN_BYTES})` };
  }
  return { ok: true, msg: `${buffer.length} bytes` };
}

async function main() {
  const origin = (
    process.env.OG_TEST_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://vyvata.com"
  ).replace(/\/$/, "");

  const singleSlug = process.argv[2];
  const probes = await pickProbes(singleSlug);

  console.log(`[og-smoke] origin=${origin}`);
  console.log(`[og-smoke] ${probes.length} probe${probes.length === 1 ? "" : "s"}`);

  let failed = 0;
  for (const p of probes) {
    const result = await probe(origin, p);
    const marker = result.ok ? "OK" : "FAIL";
    console.log(`[og-smoke] ${marker}  ${p.label}  slug=${p.slug}  ${result.msg}`);
    if (!result.ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`[og-smoke] ${failed}/${probes.length} probes failed`);
    process.exit(1);
  }
  console.log(`[og-smoke] all ${probes.length} probes passed`);
}

main().catch((err) => {
  console.error("[og-smoke] ERROR", err);
  process.exit(1);
});
