// Gap report CTA — surfaces when a product is AI-inferred and has meaningful
// upside. Shows top 3 dimensions with gain potential and a link to the
// brand submission flow (mailto for now; Phase 3 builds the real portal).

import Link from "next/link";
import { Sparkles, TrendingUp, ArrowUpRight } from "lucide-react";
import type { GapReport } from "@/lib/scoring/gap-report";

const ICON_BY_DIM: Record<string, string> = {
  evidence: "🔬",
  safety: "🛡️",
  formulation: "⚗️",
  manufacturing: "🏭",
  transparency: "🔍",
  sustainability: "🌿",
};

export default function GapReportBlock({
  report,
  brand,
  productName,
  slug,
}: {
  report: GapReport;
  brand: string;
  productName: string;
  slug: string;
}) {
  if (report.totalUpside < 1 || report.topOpportunities.length === 0) return null;

  const mailto =
    `mailto:brands@vyvata.com?subject=${encodeURIComponent(`Verify ${brand} ${productName}`)}` +
    `&body=${encodeURIComponent(
      `I'd like to submit documentation to unlock verified scoring for ${brand} ${productName}.\n\nProduct: https://vyvata.com/products/${slug}\n\nPlease send me the submission checklist.`
    )}`;

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(20,184,166,0.08) 100%)",
        border: "1px solid rgba(167,139,250,0.3)",
      }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp size={16} style={{ color: "#a78bfa" }} />
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "#a78bfa", fontFamily: "Montserrat, sans-serif" }}
        >
          Gap Report · AI Inferred
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-base font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
          This product could score up to{" "}
          <span style={{ color: "#a78bfa" }}>{report.potentialIntegrity}/100</span>
          {" "}with verification
        </p>
        <p className="text-xs" style={{ color: "#C9D6DF" }}>
          Currently {report.aiIntegrity}/100 from public data alone ·{" "}
          <span style={{ color: "#34D399", fontWeight: 700 }}>
            +{report.totalUpside} point{report.totalUpside === 1 ? "" : "s"}
          </span>{" "}
          unlockable by submitting documentation.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
          Biggest opportunities
        </p>
        {report.topOpportunities.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg"
            style={{ background: "rgba(11,31,59,0.4)" }}
          >
            <span style={{ fontSize: 16 }}>{ICON_BY_DIM[d.id] ?? "•"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {d.label}
              </p>
              <p className="text-[10px] truncate" style={{ color: "#7A90A8" }}>
                {d.requiredEvidence.slice(0, 2).join(" · ")}
              </p>
            </div>
            <span
              className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: "#34D399",
              }}
            >
              +{d.upside}
            </span>
          </div>
        ))}
      </div>

      <Link
        href={mailto}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold"
        style={{
          background: "linear-gradient(135deg, #a78bfa, #14B8A6)",
          color: "#0B1F3B",
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "0.05em",
        }}
      >
        <Sparkles size={12} />
        Submit documentation
        <ArrowUpRight size={12} />
      </Link>
    </div>
  );
}
