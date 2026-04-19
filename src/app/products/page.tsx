import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Award, Filter } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase";
import { VyvataLogo } from "@/components/VyvataLogo";
import { productUrl } from "@/lib/urls";
import { TIER_COLOR } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Products · Vyvata",
  description: "Vyvata integrity scores for supplement products — evidence-graded, safety-checked, formulation-audited.",
};

type Tier = "elite" | "verified" | "standard" | "rejected";

interface Row {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  price_per_serving: number | null;
  product_ingredients: Array<{ id: string }>;
  certifications: Array<{ id: string; verified: boolean }>;
  product_scores: Array<{
    integrity_score: number;
    tier: Tier;
    is_current: boolean;
  }>;
}

const ORDER: Tier[] = ["elite", "verified", "standard", "rejected"];

export default async function ProductsCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; category?: string }>;
}) {
  const { tier, category } = await searchParams;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id, slug, brand, name, category, price_per_serving,
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

  let filtered = rows;
  if (tier && ORDER.includes(tier as Tier)) {
    filtered = filtered.filter((r) => r.current?.tier === tier);
  }
  if (category) {
    filtered = filtered.filter((r) => r.category === category);
  }

  // Sort: scored products first (by integrity desc), then unscored by brand
  filtered.sort((a, b) => {
    const as = a.current?.integrity_score ?? -1;
    const bs = b.current?.integrity_score ?? -1;
    if (as !== bs) return bs - as;
    return a.brand.localeCompare(b.brand);
  });

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();
  const tierCounts: Record<Tier | "all" | "unscored", number> = {
    all: rows.length,
    elite: rows.filter((r) => r.current?.tier === "elite").length,
    verified: rows.filter((r) => r.current?.tier === "verified").length,
    standard: rows.filter((r) => r.current?.tier === "standard").length,
    rejected: rows.filter((r) => r.current?.tier === "rejected").length,
    unscored: rows.filter((r) => !r.current).length,
  };

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <header
        className="px-6 py-4 border-b flex items-center justify-between max-w-5xl mx-auto"
        style={{ borderColor: "rgba(201,214,223,0.08)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <VyvataLogo size={22} />
          <span className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Vyvata
          </span>
        </Link>
        <span className="text-xs" style={{ color: "#7A90A8" }}>
          {rows.length} product{rows.length === 1 ? "" : "s"} scored
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            VYVATA STANDARDS FRAMEWORK
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Every supplement, evidence-graded.
          </h1>
          <p className="text-sm max-w-xl" style={{ color: "#C9D6DF" }}>
            Products scored across six dimensions: evidence, safety, formulation,
            manufacturing, transparency, and sustainability. Tiers are determined
            by a weighted integrity score — elite (90+), verified (75-89),
            standard (60-74), rejected (&lt;60).
          </p>
        </div>

        {/* Tier filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "#7A90A8" }}>
            <Filter size={12} />
            <span>Filter by tier</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <TierChip href="/products" label="All" count={tierCounts.all} active={!tier} color="#14B8A6" />
            {ORDER.map((t) => (
              <TierChip
                key={t}
                href={`/products?tier=${t}`}
                label={t}
                count={tierCounts[t]}
                active={tier === t}
                color={TIER_COLOR[t]}
              />
            ))}
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <CategoryChip href={tier ? `/products?tier=${tier}` : "/products"} label="All categories" active={!category} />
              {categories.map((c) => (
                <CategoryChip
                  key={c}
                  href={tier ? `/products?tier=${tier}&category=${c}` : `/products?category=${c}`}
                  label={c}
                  active={category === c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Products list */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
          >
            <p className="text-sm font-semibold text-white">No products match</p>
            <p className="text-xs mt-1" style={{ color: "#7A90A8" }}>
              {rows.length === 0
                ? "Products will appear here as they're ingested."
                : "Try clearing filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((p) => {
              const s = p.current;
              const tierColor = s ? TIER_COLOR[s.tier] : "#4a6080";
              const certs = p.certifications.filter((c) => c.verified).length;
              return (
                <Link
                  key={p.id}
                  href={productUrl(p)}
                  className="rounded-xl px-4 py-4 flex items-center gap-4 hover:translate-x-0.5 transition-transform"
                  style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{
                      background: s ? `${tierColor}18` : "rgba(201,214,223,0.04)",
                      border: `1px solid ${tierColor}40`,
                    }}
                  >
                    {s ? (
                      <>
                        <span className="text-xl font-black leading-none" style={{ color: tierColor, fontFamily: "Montserrat, sans-serif" }}>
                          {s.integrity_score}
                        </span>
                        <span className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: tierColor }}>
                          {s.tier}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: "#4a6080" }}>—</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      {p.brand} · {p.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>
                      {p.category}
                      {p.price_per_serving != null && ` · $${Number(p.price_per_serving).toFixed(2)}/serving`}
                      {certs > 0 && ` · `}
                      {certs > 0 && (
                        <span style={{ color: "#14B8A6" }}>
                          <Award size={10} className="inline -mt-0.5 mr-0.5" />
                          {certs} cert{certs === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  </div>
                  <ArrowRight size={14} style={{ color: "#4a6080" }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function TierChip({ href, label, count, active, color }: {
  href: string; label: string; count: number; active: boolean; color: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
      style={{
        background: active ? `${color}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? color + "40" : "rgba(201,214,223,0.08)"}`,
        color: active ? color : "#C9D6DF",
      }}
    >
      {label}
      <span className="text-[10px]" style={{ color: active ? color : "#7A90A8" }}>
        {count}
      </span>
    </Link>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs capitalize"
      style={{
        background: active ? "rgba(20,184,166,0.08)" : "transparent",
        border: `1px solid ${active ? "rgba(20,184,166,0.3)" : "rgba(201,214,223,0.08)"}`,
        color: active ? "#14B8A6" : "#7A90A8",
      }}
    >
      {label}
    </Link>
  );
}
