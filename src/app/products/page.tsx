import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Award, Filter, ArrowUpDown } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase";
import { VyvataLogo } from "@/components/VyvataLogo";
import AuthNavLink from "@/components/AuthNavLink";
import { productUrl } from "@/lib/urls";
import { TIER_COLOR } from "@/lib/tokens";

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
  certifications: Array<{ id: string; verified: boolean }>;
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

export default async function ProductsCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{
    tier?: string;
    category?: string;
    sort?: string;
    show_unscored?: string;
  }>;
}) {
  const sp = await searchParams;
  const tier = sp.tier;
  const category = sp.category;
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
      certifications (id, verified),
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
  const buildUrl = (next: Partial<{ tier?: string; category?: string; sort?: SortKey; show_unscored?: string }>) => {
    const p = new URLSearchParams();
    const t = next.tier !== undefined ? next.tier : tier;
    const c = next.category !== undefined ? next.category : category;
    const s = next.sort !== undefined ? next.sort : sort;
    const u = next.show_unscored !== undefined ? next.show_unscored : (showUnscored ? "1" : undefined);
    if (t) p.set("tier", t);
    if (c) p.set("category", c);
    if (s && s !== "score") p.set("sort", s);
    if (u) p.set("show_unscored", u);
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
        </div>

        {/* ── RESULT COUNT ─────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs" style={{ color: "#7A90A8" }}>
          <span>
            Showing <strong style={{ color: "#C9D6DF" }}>{filtered.length}</strong>
            {" "}of {scoredCount + (showUnscored ? unscoredCount : 0)} products
            {tier && ` · ${TIER_LABEL[tier as Tier]} tier`}
            {category && ` · ${category}`}
          </span>
          {(tier || category || showUnscored || sort !== "score") && (
            <Link
              href="/products"
              className="hover:text-white transition-colors"
            >
              Reset filters
            </Link>
          )}
        </div>

        {/* ── PRODUCTS LIST ────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
          >
            <p className="text-base font-semibold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              No products match these filters
            </p>
            <p className="text-sm mt-2" style={{ color: "#7A90A8" }}>
              {rows.length === 0
                ? "Products will appear here as they're ingested from the NIH DSLD registry."
                : "Try clearing filters or a different tier."}
            </p>
            {rows.length > 0 && (
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold"
                style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
              >
                Reset filters
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const s = p.current;
              const tierColor = s ? TIER_COLOR[s.tier] : "#4a6080";
              const certs = p.certifications.filter((c) => c.verified).length;
              return (
                <Link
                  key={p.id}
                  href={productUrl(p)}
                  className="group rounded-xl px-5 py-4 flex items-center gap-5 transition-all"
                  style={{
                    background: "rgba(17,32,64,0.6)",
                    border: "1px solid rgba(201,214,223,0.08)",
                  }}
                >
                  {/* Score ring */}
                  <ScoreBadge score={s?.integrity_score ?? null} tier={s?.tier ?? null} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p
                        className="text-sm md:text-base font-bold text-white truncate"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {p.brand}
                      </p>
                      <p className="text-sm truncate" style={{ color: "#C9D6DF" }}>
                        {p.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs" style={{ color: "#7A90A8" }}>
                      {p.category && (
                        <span className="capitalize">{p.category.replace(/_/g, " ")}</span>
                      )}
                      {p.price_per_serving != null && (
                        <span>${Number(p.price_per_serving).toFixed(2)}/serving</span>
                      )}
                      {certs > 0 && (
                        <span className="inline-flex items-center gap-1" style={{ color: "#14B8A6" }}>
                          <Award size={11} />
                          {certs} cert{certs === 1 ? "" : "s"}
                        </span>
                      )}
                      {p.product_ingredients.length > 0 && (
                        <span>{p.product_ingredients.length} ingredient{p.product_ingredients.length === 1 ? "" : "s"}</span>
                      )}
                    </div>
                  </div>

                  {/* CTA arrow */}
                  <div
                    className="hidden md:flex items-center gap-1.5 text-xs font-semibold opacity-40 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{ color: tierColor, fontFamily: "Montserrat, sans-serif" }}
                  >
                    View scorecard
                    <ArrowRight size={13} />
                  </div>
                  <ArrowRight size={14} className="md:hidden shrink-0" style={{ color: "#4a6080" }} />
                </Link>
              );
            })}
          </div>
        )}

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
 * Compact score badge rendered as an SVG arc — the per-row visual anchor.
 * Mirrors the full ScoreRing language (tier color + arc + centered number)
 * at 60px so the row stays scannable. Unscored products render a subdued
 * dash in the same footprint so layout doesn't shift.
 */
function ScoreBadge({ score, tier }: { score: number | null; tier: Tier | null }) {
  const SIZE = 60;
  const STROKE = 5;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dashOffset = CIRC - (pct / 100) * CIRC;
  const color = tier ? TIER_COLOR[tier] : "#4a6080";

  if (score == null) {
    return (
      <div
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{
          width: SIZE,
          height: SIZE,
          background: "rgba(201,214,223,0.04)",
          border: "1px dashed rgba(201,214,223,0.15)",
        }}
      >
        <span className="text-xs" style={{ color: "#4a6080" }}>—</span>
      </div>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(201,214,223,0.08)"
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        <span
          className="text-lg font-black leading-none tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

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
