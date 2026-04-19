// URL helpers. Centralize path construction so a schema change (e.g., adding
// a product-version segment) doesn't require grepping the whole codebase.

/**
 * Absolute base URL for metadata, OG images, and transactional emails.
 *
 * Priority (first non-empty wins):
 *   1. NEXT_PUBLIC_APP_URL — explicit override, preferred
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel production hostname
 *   3. VERCEL_URL — any Vercel deployment hostname (preview or prod)
 *   4. https://vyvata.com — final fallback
 *
 * Never returns `http://localhost:3000` in a built artifact. Facebook and
 * LinkedIn scrapers that see literal `localhost` in og:image reject the
 * share with "Bad Response Code" — we've burned one Facebook scrape on
 * exactly that and won't do it again.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodHost) return `https://${prodHost}`;
  const anyHost = process.env.VERCEL_URL;
  if (anyHost) return `https://${anyHost}`;
  return "https://vyvata.com";
}

/**
 * Canonical public URL for a product scorecard. Prefers slug, falls back to
 * UUID — both routes resolve to the same page and UUID hits 308 to slug.
 */
export function productUrl(product: { slug?: string | null; id: string }): string {
  return `/products/${product.slug ?? product.id}`;
}

/**
 * Absolute variant of productUrl, for OG image metadata, emails, or any
 * context where a relative path won't resolve (social crawlers, Resend, etc.).
 */
export function productUrlAbsolute(
  product: { slug?: string | null; id: string },
  base?: string
): string {
  return `${base ? base.replace(/\/$/, "") : getAppBaseUrl()}${productUrl(product)}`;
}
