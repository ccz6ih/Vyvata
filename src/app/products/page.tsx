import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Award, Filter, ArrowUpDown, DollarSign } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase";
import { VyvataLogo } from "@/components/VyvataLogo";
import AuthNavLink from "@/components/AuthNavLink";
import { TIER_COLOR } from "@/lib/tokens";
import ProductGrid, { type GridProduct } from "./ProductGrid";

export const metadata: Metadata = {
  title: "Scores · Vyvata",
  description:
    "Independent VSF integrity scores for 200+ supplement products — evidence-graded, safety-checked, formulation-audited, certification-weighted.",
};

type Tier = "elite" | "verified" | "standard" | "rejected";
type SortKey = "score" | "brand" | "recent";

interface Row {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  price_per_serving: number | null;
  created_at: string | null;
  product_ingredients: Array<{ id: string }>;
  certifications: Array<{ id: string; verified: boolean; type: string }>;
  product_scores: Array<{
    integrity_score: number;
    tier: Tier;
    is_current: boolean;
  }>;
}

const TIER_ORDER: Tier[] = ["elite", "verified", "standard", "rejected"];

const TIER_LABEL: Record<Tier, string> = {
  elite: "Elite",
  verified: "Verified",
  standard: "Standard",
  rejected: "Rejected",
};

const SORT_LABEL: Record<SortKey, string> = {
  score: "Highest score",
  brand: "Brand A–Z",
  recent: "Recently scored",
};

// Certifications surfaced as filter chips. Kept intentionally short —
// these are the ones practitioners and athletes actually hunt for.
// Full cert list (vegan, kosher, halal, gluten-free, etc.) is still
// available per-product on the scorecard; they just don't earn UI
// space as top-level filters.
const CERT_FILTERS: Array<{ value: string; label: string }> = [
  { value: "nsf_sport", label: "NSF Sport" },
  { value: "nsf_gmp", label: "NSF GMP" },
  { value: "usp_verified", label: "USP Verified" },
  { value: "informed_sport", label: "Informed Sport" },
  { value: "non_gmo", label: "Non-GMO" },
  { value: "organic_usda", label: "USDA Organic" },
];

const PRICE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "under-0.50", label: "Under $0.50" },
  { value: "0.50-1", label: "$0.50–$1" },
  { value: "1-2", label: "$1–$2" },
  { value: "over-2", label: "Over $2" },
];

export default async function ProductsCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{
    tier?: string;
    category?: string;
    sort?: string;
    show_unscored?: string;
    cert?: string;
    price?: string;
  }>;
}) {
  const sp = await searchParams;
  const tier = sp.tier;
  const category = sp.category;
  const cert = sp.cert;
  const price = sp.price;
  const sort: SortKey = (["score", "brand", "recent"] as const).includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : "score";
  const showUnscored = sp.show_unscored === "1";

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id, slug, brand, name, category, price_per_serving, created_at,
      product_ingredients (id),
      certifications (id, verified, type),
      product_scores (integrity_score, tier, is_current)
    `)
    .eq("status", "active")
    .order("brand", { ascending: true });

  const rows = (error ? [] : ((data ?? []) as unknown as Row[])).map((r) => ({
    ...r,
    current: r.product_scores.find((s) => s.is_current) ?? null,
  }));

  // Tier distribution uses the full set (pre-filter) so the hero strip
  // always reflects the catalogue-wide picture, not the current view.
  const tierCounts: Record<Tier, number> = {
    elite: rows.filter((r) => r.current?.tier === "elite").length,
    verified: rows.filter((r) => r.current?.tier === "verified").length,
    standard: rows.filter((r) => r.current?.tier === "standard").length,
    rejected: rows.filter((r) => r.current?.tier === "rejected").length,
  };
  const scoredCount = tierCounts.elite + tierCounts.verified + tierCounts.standard + tierCounts.rejected;
  const unscoredCount = rows.length - scoredCount;

  let filtered = rows;

  // Default: hide unscored from browse view unless explicitly requested.
  // Unscored products are valid data but add visual noise for a cold visitor
  // who came to see scored products. The toggle surfaces them explicitly.
  if (!showUnscored) filtered = filtered.filter((r) => r.current);

  if (tier && TIER_ORDER.includes(tier as Tier)) {
    filtered = filtered.filter((r) => r.current?.tier === tier);
  }
  if (category) {
    filtered = filtered.filter((r) => r.category === category);
  }
  if (cert) {
    filtered = filtered.filter((r) =>
      r.certifications.some((c) => c.verified && c.type === cert)
    );
  }
  if (price) {
    filtered = filtered.filter((r) => {
      const pv = r.price_per_serving;
      if (pv == null) return false;
      const n = Number(pv);
      switch (price) {
        case "under-0.50": return n < 0.5;
        case "0.50-1": return n >= 0.5 && n < 1;
        case "1-2": return n >= 1 && n < 2;
        case "over-2": return n >= 2;
        default: return true;
      }
    });
  }

  // Sort routing.
  filtered.sort((a, b) => {
    if (sort === "brand") {
      return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
    }
    if (sort === "recent") {
      const ad = a.created_at ? Date.parse(a.created_at) : 0;
      const bd = b.created_at ? Date.parse(b.created_at) : 0;
      if (ad !== bd) return bd - ad;
      return a.brand.localeCompare(b.brand);
    }
    // score (default): integrity desc, unscored last, tiebreak by brand
    const as = a.current?.integrity_score ?? -1;
    const bs = b.current?.integrity_score ?? -1;
    if (as !== bs) return bs - as;
    return a.brand.localeCompare(b.brand);
  });

  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort();

  // Build URL-preserving link builder so filter changes don't reset each
  // other. E.g., picking a tier with an active sort keeps the sort.
  const buildUrl = (next: Partial<{ tier?: string; category?: string; sort?: SortKey; show_unscored?: string; cert?: string; price?: string }>) => {
    const p = new URLSearchParams();
    const t = next.tier !== undefined ? next.tier : tier;
    const c = next.category !== undefined ? next.category : category;
    const s = next.sort !== undefined ? next.sort : sort;
    const u = next.show_unscored !== undefined ? next.show_unscored : (showUnscored ? "1" : undefined);
    const ce = next.cert !== undefined ? next.cert : cert;
    const pr = next.price !== undefined ? next.price : price;
    if (t) p.set("tier", t);
    if (c) p.set("category", c);
    if (s && s !== "score") p.set("sort", s);
    if (u) p.set("show_unscored", u);
    if (ce) p.set("cert", ce);
    if (pr) p.set("price", pr);
    const qs = p.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* ── NAV (matches homepage) ───────────────────────────── */}
      <nav
        className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto border-b"
        style={{ borderColor: "rgba(201,214,223,0.08)" }}
      >
        <Link href="/" className="flex items-center gap-3">
          <VyvataLogo size={28} />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            Vyvata
          </span>
        </Link>
        <div
          className="hidden md:flex items-center gap-6 text-sm"
          style={{ color: "#C9D6DF" }}
        >
          <Link href="/products" className="transition-colors" style={{ color: "#FFFFFF" }}>
            Scores
          </Link>
          <Link href="/methodology" className="hover:text-white transition-colors">
            Methodology
          </Link>
          <Link href="/#how" className="hover:text-white transition-colors">
            How it works
          </Link>
          <Link href="/#practitioners" className="hover:text-white transition-colors">
            For Practitioners
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <AuthNavLink />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">

        {/* ── HERO ─────────────────────────────────────────── */}
        <div className="space-y-5">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            THE VYVATA SCORES
          </p>
          <h1
            className="text-3xl md:text-5xl font-black text-white leading-tight"
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.02em" }}
          >
            Every supplement.
            <br />
            Scored the same way.
          </h1>
          <p className="text-base md:text-lg max-w-2xl leading-relaxed" style={{ color: "#C9D6DF" }}>
            {scoredCount} product{scoredCount === 1 ? "" : "s"} graded across six dimensions — evidence, formulation, manufacturing, safety, transparency, and sustainability. Updated daily from federal data sources.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href="/methodology"
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              How scores are calculated
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* ── TIER DISTRIBUTION BAR ────────────────────────── */}
        {scoredCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs" style={{ color: "#7A90A8" }}>
              <span className="font-semibold tracking-widest uppercase">Tier distribution</span>
              <span>
                {scoredCount} scored
                {unscoredCount > 0 && ` · ${unscoredCount} pending`}
              </span>
            </div>
            <div
              className="h-3 rounded-full overflow-hidden flex"
              style={{ background: "rgba(255,255,255,0.04)" }}
              role="img"
              aria-label={`Tier distribution: ${tierCounts.elite} Elite, ${tierCounts.verified} Verified, ${tierCounts.standard} Standard, ${tierCounts.rejected} Rejected`}
            >
              {TIER_ORDER.map((t) => {
                const pct = scoredCount ? (tierCounts[t] / scoredCount) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={t}
                    style={{
                      width: `${pct}%`,
                      background: TIER_COLOR[t],
                      opacity: 0.85,
                    }}
                    title={`${TIER_LABEL[t]}: ${tierCounts[t]} (${pct.toFixed(0)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs" style={{ color: "#C9D6DF" }}>
              {TIER_ORDER.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: TIER_COLOR[t] }}
                  />
                  <span className="font-medium">{TIER_LABEL[t]}</span>
                  <span style={{ color: "#7A90A8" }}>
                    {tierCounts[t]} · {scoredCount ? Math.round((tierCounts[t] / scoredCount) * 100) : 0}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ──────────────────────────────────────── */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: "rgba(17, 32, 64, 0.5)",
            border: "1px solid rgba(201,214,223,0.08)",
          }}
        >
          {/* Tier chips + sort */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
                <Filter size={11} />
                <span>Filter by tier</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <TierChip
                  href={buildUrl({ tier: "" })}
                  label="All tiers"
                  count={scoredCount}
                  active={!tier}
                  color="#14B8A6"
                />
                {TIER_ORDER.map((t) => (
                  <TierChip
                    key={t}
                    href={buildUrl({ tier: t })}
                    label={TIER_LABEL[t]}
                    count={tierCounts[t]}
                    active={tier === t}
                    color={TIER_COLOR[t]}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
                <ArrowUpDown size={11} />
                <span>Sort</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["score", "brand", "recent"] as const).map((s) => (
                  <Link
                    key={s}
                    href={buildUrl({ sort: s })}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: sort === s ? "rgba(20,184,166,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${sort === s ? "rgba(20,184,166,0.4)" : "rgba(201,214,223,0.08)"}`,
                      color: sort === s ? "#14B8A6" : "#C9D6DF",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {SORT_LABEL[s]}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Category + unscored toggle */}
          {(categories.length > 1 || unscoredCount > 0) && (
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 pt-4 border-t" style={{ borderColor: "rgba(201,214,223,0.06)" }}>
              {categories.length > 1 && (
                <div className="flex-1 space-y-2">
                  <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
                    Category
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <CategoryChip href={buildUrl({ category: "" })} label="All" active={!category} />
                    {categories.map((c) => (
                      <CategoryChip
                        key={c}
                        href={buildUrl({ category: c })}
                        label={c}
                        active={category === c}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unscoredCount > 0 && (
                <div className="space-y-2 shrink-0">
                  <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
                    Unscored
                  </div>
                  <Link
                    href={buildUrl({ show_unscored: showUnscored ? undefined : "1" })}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: showUnscored ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${showUnscored ? "rgba(245,158,11,0.35)" : "rgba(201,214,223,0.08)"}`,
                      color: showUnscored ? "#F59E0B" : "#C9D6DF",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: showUnscored ? "#F59E0B" : "transparent",
                        border: `1px solid ${showUnscored ? "#F59E0B" : "#4a6080"}`,
                      }}
                    />
                    {showUnscored ? "Showing unscored" : `Show ${unscoredCount} unscored`}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Certification + Price filters */}
          <div
            className="flex flex-col lg:flex-row lg:items-start gap-5 pt-4 border-t"
            style={{ borderColor: "rgba(201,214,223,0.06)" }}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
                <Award size={11} />
                <span>Certification</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <CategoryChip href={buildUrl({ cert: "" })} label="Any" active={!cert} />
                {CERT_FILTERS.map((c) => (
                  <CategoryChip
                    key={c.value}
                    href={buildUrl({ cert: c.value })}
                    label={c.label}
                    active={cert === c.value}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
                <DollarSign size={11} />
                <span>Price per serving</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <CategoryChip href={buildUrl({ price: "" })} label="Any" active={!price} />
                {PRICE_FILTERS.map((pf) => (
                  <CategoryChip
                    key={pf.value}
                    href={buildUrl({ price: pf.value })}
                    label={pf.label}
                    active={price === pf.value}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RESET FILTERS (when any active) ──────────────── */}
        {(tier || category || cert || price || showUnscored || sort !== "score") && (
          <div className="flex items-center justify-between text-xs" style={{ color: "#7A90A8" }}>
            <span>
              {[
                tier && TIER_LABEL[tier as Tier] + " tier",
                category && category.replace(/_/g, " "),
                cert && CERT_FILTERS.find((c) => c.value === cert)?.label,
                price && PRICE_FILTERS.find((p) => p.value === price)?.label,
                showUnscored && "Including unscored",
                sort !== "score" && SORT_LABEL[sort],
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <Link href="/products" className="hover:text-white transition-colors font-semibold">
              Reset all filters
            </Link>
          </div>
        )}

        {/* ── PRODUCT GRID ─────────────────────────────────── */}
        <ProductGrid products={filtered as unknown as GridProduct[]} totalCount={rows.length} />

        {/* ── METHODOLOGY FOOTER NOTE ──────────────────────── */}
        <div
          className="rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4"
          style={{
            background: "rgba(20, 184, 166, 0.04)",
            border: "1px solid rgba(20, 184, 166, 0.15)",
          }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
              How do we calculate these scores?
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#C9D6DF" }}>
              The Vyvata Standards Framework weights six dimensions (Evidence 25, Formulation 20, Manufacturing 20, Safety 15, Transparency 12, Sustainability 8) and derives each score from public federal data sources — FDA, NIH, NSF, USP, and peer-reviewed literature.
            </p>
          </div>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0"
            style={{
              border: "1px solid rgba(20, 184, 166, 0.4)",
              color: "#14B8A6",
              background: "transparent",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Read methodology
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer
        className="px-6 py-8 border-t mt-10"
        style={{ borderColor: "rgba(201,214,223,0.08)", background: "#0B1F3B" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <VyvataLogo size={20} />
            <span className="font-bold text-sm text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Vyvata
            </span>
          </div>
          <p className="text-xs text-center max-w-2xl" style={{ color: "#C9D6DF" }}>
            The independent integrity score for what you put in your body.
          </p>
          <div className="flex items-center gap-6 text-xs" style={{ color: "#7A90A8" }}>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/methodology" className="hover:text-white transition-colors">Methodology</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────

/**
 * Pill-style tier filter. Same visual language as the original; kept for
 * continuity with in-app recommendation cards that also use tier chips.
 */
function TierChip({
  href,
  label,
  count,
  active,
  color,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
      style={{
        background: active ? `${color}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? color + "40" : "rgba(201,214,223,0.08)"}`,
        color: active ? color : "#C9D6DF",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {label}
      <span
        className="text-[10px] tabular-nums"
        style={{ color: active ? color : "#7A90A8" }}
      >
        {count}
      </span>
    </Link>
  );
}

/**
 * Lighter-weight chip for category filters. Intentionally quieter than
 * tier chips so the tier dimension visually dominates, since tier is the
 * primary filter a practitioner or consumer actually reasons about.
 */
function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs capitalize transition-colors"
      style={{
        background: active ? "rgba(20,184,166,0.08)" : "transparent",
        border: `1px solid ${active ? "rgba(20,184,166,0.3)" : "rgba(201,214,223,0.08)"}`,
        color: active ? "#14B8A6" : "#7A90A8",
      }}
    >
      {label.replace(/_/g, " ")}
    </Link>
  );
}
