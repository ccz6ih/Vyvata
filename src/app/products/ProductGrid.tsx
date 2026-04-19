"use client";

// ProductGrid — client shell over a server-filtered product array.
//
// The parent /products/page.tsx server component runs the Supabase
// query and applies every URL-param filter (tier, category, sort,
// certification, price range, unscored toggle). What arrives here is
// already filtered.
//
// This component adds one thing the server can't do without a round-
// trip: an instant client-side text search across brand / name /
// category. Keystroke latency matters more than URL shareability for
// the "find me the Thorne product I'm looking for" case.
//
// If/when pagination lands (target: >500 products in catalogue), the
// search should migrate to a URL param with server-side query, at
// which point this component becomes a thin presentational wrapper.

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Award, Search, X } from "lucide-react";
import { TIER_COLOR, type Tier } from "@/lib/tokens";
import { productUrl } from "@/lib/urls";

export interface GridProduct {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  price_per_serving: number | null;
  product_ingredients: Array<{ id: string }>;
  certifications: Array<{ id: string; verified: boolean }>;
  current: {
    integrity_score: number;
    tier: Tier;
  } | null;
}

interface Props {
  products: GridProduct[];
  totalCount: number; // products before URL-param filtering, for the "X of Y" line
}

export default function ProductGrid({ products, totalCount }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = `${p.brand} ${p.name} ${p.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, products]);

  return (
    <div className="space-y-5">
      <SearchBar
        value={query}
        onChange={setQuery}
        resultCount={filtered.length}
        totalCount={totalCount}
        filterCount={products.length}
      />

      {filtered.length === 0 ? (
        <EmptyState hasQuery={query.length > 0} onClear={() => setQuery("")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Search input
// ─────────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChange,
  resultCount,
  totalCount,
  filterCount,
}: {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
  totalCount: number;
  filterCount: number;
}) {
  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors focus-within:border-[#14B8A6]"
        style={{
          background: "rgba(17, 32, 64, 0.6)",
          border: "1px solid rgba(201,214,223,0.12)",
        }}
      >
        <Search size={16} style={{ color: "#7A90A8" }} className="shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by brand, product, or category…"
          className="flex-1 bg-transparent border-0 text-white placeholder:text-[#7A90A8] text-sm focus:outline-none"
          style={{ fontFamily: "Inter, sans-serif" }}
          aria-label="Search products"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 p-1 rounded-md hover:bg-white/5 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} style={{ color: "#7A90A8" }} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-xs" style={{ color: "#7A90A8" }}>
        <span>
          Showing <strong style={{ color: "#C9D6DF" }}>{resultCount}</strong>
          {" "}of {filterCount} filtered
          {filterCount !== totalCount && ` (${totalCount} total in catalogue)`}
        </span>
        {value && (
          <span style={{ color: "#14B8A6" }}>
            matching &ldquo;{value}&rdquo;
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state — either "no search match" or "no filter match"
// ─────────────────────────────────────────────────────────────

function EmptyState({ hasQuery, onClear }: { hasQuery: boolean; onClear: () => void }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        background: "rgba(17,32,64,0.4)",
        border: "1px dashed rgba(201,214,223,0.12)",
      }}
    >
      <p
        className="text-base font-semibold text-white"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        {hasQuery ? "No products match your search" : "No products match these filters"}
      </p>
      <p className="text-sm mt-2" style={{ color: "#7A90A8" }}>
        {hasQuery
          ? "Try a different spelling, a broader term, or clear the search to see all filtered results."
          : "Try removing a filter or resetting to see the full catalogue."}
      </p>
      {hasQuery && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold transition-colors hover:brightness-110"
          style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
        >
          Clear search
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Product card — the visual unit of the catalogue.
// Score ring is the hero. Brand/name is identity. Everything
// else is tertiary support. Entire card is the click target.
// ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: GridProduct }) {
  const s = product.current;
  const tierColor = s ? TIER_COLOR[s.tier] : "#4a6080";
  const tierColorSoft = s ? `${TIER_COLOR[s.tier]}20` : "rgba(201,214,223,0.06)";
  const certs = product.certifications.filter((c) => c.verified).length;
  const ingredientCount = product.product_ingredients.length;

  return (
    <Link
      href={productUrl(product)}
      className="group relative rounded-2xl p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5"
      style={{
        background: "rgba(17, 32, 64, 0.6)",
        border: `1px solid ${tierColorSoft}`,
      }}
    >
      {/* Top row: score ring + tier/brand label */}
      <div className="flex items-start gap-4">
        <CardScoreRing
          score={s?.integrity_score ?? null}
          tier={s?.tier ?? null}
        />
        <div className="flex-1 min-w-0 flex flex-col justify-center h-24">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold truncate"
            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
          >
            {product.category.replace(/_/g, " ")}
          </p>
          <p
            className="text-base font-bold text-white mt-1 leading-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {product.brand}
          </p>
          <p
            className="text-sm leading-snug mt-0.5 line-clamp-2"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            title={product.name}
          >
            {product.name}
          </p>
        </div>
      </div>

      {/* Bottom row: metadata + CTA hint */}
      <div
        className="flex items-center justify-between pt-3 mt-auto border-t text-xs"
        style={{ borderColor: "rgba(201,214,223,0.06)", color: "#7A90A8" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {product.price_per_serving != null && (
            <span>
              <strong className="text-white tabular-nums">
                ${Number(product.price_per_serving).toFixed(2)}
              </strong>
              <span className="opacity-70">/serving</span>
            </span>
          )}
          {certs > 0 && (
            <span className="inline-flex items-center gap-1" style={{ color: "#14B8A6" }}>
              <Award size={11} />
              {certs}
            </span>
          )}
          {ingredientCount > 0 && (
            <span>{ingredientCount} ing.</span>
          )}
        </div>
        <span
          className="inline-flex items-center gap-1 font-semibold opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ color: tierColor, fontFamily: "Montserrat, sans-serif" }}
        >
          View
          <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Card score ring — larger version of the list view's badge.
// 96px SVG arc matching the full-scorecard ScoreRing visual
// language (tier-coloured gradient arc, centred score, tier
// label below). Static — no count-up animation on grid items,
// since a grid of animated counters on mount reads as noisy.
// ─────────────────────────────────────────────────────────────

function CardScoreRing({
  score,
  tier,
}: {
  score: number | null;
  tier: Tier | null;
}) {
  const SIZE = 96;
  const STROKE = 7;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dashOffset = CIRC - (pct / 100) * CIRC;
  const color = tier ? TIER_COLOR[tier] : "#4a6080";

  if (score == null) {
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-center rounded-full"
        style={{
          width: SIZE,
          height: SIZE,
          background: "rgba(201,214,223,0.04)",
          border: "1px dashed rgba(201,214,223,0.15)",
        }}
      >
        <span className="text-lg" style={{ color: "#4a6080" }}>—</span>
        <span
          className="text-[8px] uppercase tracking-widest mt-0.5"
          style={{ color: "#7A90A8" }}
        >
          Unscored
        </span>
      </div>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id={`card-ring-${tier ?? "none"}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
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
          stroke={`url(#card-ring-${tier ?? "none"})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        <span
          className="text-2xl font-black leading-none tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
        <span
          className="text-[8px] uppercase font-bold tracking-[0.2em] mt-1"
          style={{ color }}
        >
          {tier}
        </span>
      </div>
    </div>
  );
}
