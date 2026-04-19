"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ArrowRight, Sparkles } from "lucide-react";

interface Recommendation {
  id: string;
  slug?: string | null;
  brand: string;
  name: string;
  price_per_serving: number | null;
  product_url: string | null;
  matched_ingredient: {
    ingredient_name: string;
    dose: number;
    unit: string;
    form: string | null;
    bioavailability: string | null;
  } | null;
  certifications: string[];
  integrity_score: number | null;
  tier: "elite" | "verified" | "standard" | "rejected" | null;
}

const TIER_COLOR: Record<string, string> = {
  elite: "#34D399",
  verified: "#14B8A6",
  standard: "#F59E0B",
  rejected: "#F87171",
};

export default function ProductRecommendations({
  ingredient,
  limit = 3,
  title,
}: {
  ingredient: string;
  limit?: number;
  title?: string;
}) {
  const [products, setProducts] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/by-ingredient?name=${encodeURIComponent(ingredient)}&limit=${limit}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ingredient, limit]);

  if (loading) return null;
  if (!products || products.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-xl p-3 space-y-2"
      style={{
        background: "rgba(20,184,166,0.04)",
        border: "1px solid rgba(20,184,166,0.15)",
      }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#14B8A6" }}>
        <Sparkles size={10} />
        {title ?? `Top-scored ${ingredient} products`}
      </div>
      <div className="space-y-1.5">
        {products.map((p) => {
          const tierColor = p.tier ? TIER_COLOR[p.tier] : "#4a6080";
          return (
            <Link
              key={p.id}
              href={`/products/${p.slug ?? p.id}`}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:translate-x-0.5 transition-transform"
              style={{ background: "rgba(11,31,59,0.4)" }}
            >
              {/* Mini score tile */}
              <div
                className="w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0"
                style={{
                  background: p.integrity_score != null ? `${tierColor}18` : "rgba(201,214,223,0.04)",
                  border: `1px solid ${tierColor}40`,
                }}
              >
                {p.integrity_score != null ? (
                  <span
                    className="text-sm font-black leading-none"
                    style={{ color: tierColor, fontFamily: "Montserrat, sans-serif" }}
                  >
                    {p.integrity_score}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "#4a6080" }}>—</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  {p.brand} · {p.name}
                </p>
                <p className="text-[10px] truncate" style={{ color: "#7A90A8" }}>
                  {p.matched_ingredient && (
                    <>
                      {p.matched_ingredient.dose}{p.matched_ingredient.unit}
                      {p.matched_ingredient.form && ` ${p.matched_ingredient.form}`}
                    </>
                  )}
                  {p.price_per_serving != null && ` · $${Number(p.price_per_serving).toFixed(2)}/serving`}
                  {p.certifications.length > 0 && (
                    <span style={{ color: "#14B8A6" }}>
                      {" · "}
                      <Award size={9} className="inline -mt-0.5" />
                      {p.certifications.length}
                    </span>
                  )}
                </p>
              </div>

              <ArrowRight size={11} style={{ color: "#4a6080" }} className="shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
