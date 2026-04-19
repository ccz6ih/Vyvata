// URL helpers. Centralize path construction so a schema change (e.g., adding
// a product-version segment) doesn't require grepping the whole codebase.

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
  const origin = base || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}${productUrl(product)}`;
}
