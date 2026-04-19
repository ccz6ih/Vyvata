// Related products — same-category top-3 from product_scores.
// Server component; expects the scorecard page to have already run the
// query so we don't double-trip Supabase per-render.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TIER_COLOR, type Tier } from "@/lib/tokens";
import { productUrl } from "@/lib/urls";

export interface RelatedProduct {
  id: string;
  slug: string | null;
  brand: string;
  name: string;
  integrity_score: number;
  tier: Tier;
  score_mode: "ai_inferred" | "verified";
}

export default function RelatedProducts({
  category,
  products,
}: {
  category: string;
  products: RelatedProduct[];
}) {
  if (!products || products.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2
          className="text-sm font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Related in {category}
        </h2>
        <Link
          href={`/products?category=${encodeURIComponent(category)}`}
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: "#14B8A6" }}
        >
          All {category}
          <ArrowRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {products.map((p) => {
          const color = TIER_COLOR[p.tier] ?? "#4a6080";
          return (
            <Link
              key={p.id}
              href={productUrl(p)}
              className="rounded-xl p-3 flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-transform"
              style={{
                background: "rgba(17,32,64,0.6)",
                border: "1px solid rgba(201,214,223,0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0"
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}40`,
                }}
              >
                <span
                  className="text-base font-black leading-none tabular-nums"
                  style={{ color, fontFamily: "Montserrat, sans-serif" }}
                >
                  {p.integrity_score}
                </span>
              </div>
              <div className="min-w-0 w-full">
                <p
                  className="text-[10px] uppercase tracking-widest font-semibold truncate"
                  style={{ color }}
                >
                  {p.tier}
                </p>
                <p
                  className="text-xs font-semibold text-white truncate"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {p.brand}
                </p>
                <p className="text-[10px] truncate" style={{ color: "#7A90A8" }}>
                  {p.name}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
