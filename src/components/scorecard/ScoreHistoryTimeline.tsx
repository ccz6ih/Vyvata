// Score history timeline — renders the last N product_scores rows for a
// given (product_id, score_mode). Server component: rows come in via props
// so the scorecard page owns the query and can parallelize with other loads.

import { TIER_COLOR, type Tier } from "@/lib/tokens";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface HistoryPoint {
  scored_at: string;     // ISO timestamp
  integrity_score: number;
  tier: Tier;
}

export default function ScoreHistoryTimeline({
  history,
}: {
  history: HistoryPoint[];
}) {
  if (!history || history.length < 2) return null;

  // Rows arrive newest-first from the query; timeline renders oldest → newest.
  const ordered = [...history].reverse();
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const delta = last.integrity_score - first.integrity_score;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 0 ? "#34D399" : delta < 0 ? "#F87171" : "#7A90A8";

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2
          className="text-sm font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Score history
        </h2>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: deltaColor }}>
          <DeltaIcon size={12} />
          <span className="font-semibold tabular-nums">
            {delta > 0 ? "+" : ""}
            {delta} pts since {formatDate(first.scored_at)}
          </span>
        </div>
      </div>

      <div
        className="relative rounded-xl p-4 overflow-x-auto"
        style={{
          background: "rgba(17,32,64,0.4)",
          border: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-end justify-between gap-4 min-w-max">
          {ordered.map((point, i) => {
            const isLatest = i === ordered.length - 1;
            const color = TIER_COLOR[point.tier] ?? "#4a6080";
            return (
              <div key={`${point.scored_at}-${i}`} className="flex flex-col items-center gap-2">
                <div
                  className="flex flex-col items-center justify-center rounded-xl"
                  style={{
                    width: isLatest ? 72 : 52,
                    height: isLatest ? 72 : 52,
                    background: `${color}18`,
                    border: `1px solid ${color}${isLatest ? "80" : "40"}`,
                  }}
                >
                  <span
                    className="font-black tabular-nums"
                    style={{
                      color,
                      fontSize: isLatest ? 22 : 16,
                      fontFamily: "Montserrat, sans-serif",
                      lineHeight: 1,
                    }}
                  >
                    {point.integrity_score}
                  </span>
                  <span
                    className="uppercase tracking-widest mt-0.5"
                    style={{ color, fontSize: isLatest ? 9 : 8 }}
                  >
                    {point.tier}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: "#7A90A8" }}>
                  {formatDate(point.scored_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
