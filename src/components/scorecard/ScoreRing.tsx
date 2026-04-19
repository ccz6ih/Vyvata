"use client";

// Animated score ring — SVG arc + count-up number for the scorecard hero.
// Client component so the entrance animation runs on mount; the component
// is otherwise deterministic from props.

import { useEffect, useRef, useState } from "react";
import type { Tier } from "@/lib/tokens";
import { TIER_COLOR } from "@/lib/tokens";

interface ScoreRingProps {
  score: number | null;
  tier: Tier | null;
  mode: "ai_inferred" | "verified";
  size?: number;
}

const SIZE = 240;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export default function ScoreRing({
  score,
  tier,
  mode,
  size = SIZE,
}: ScoreRingProps) {
  const color = tier ? TIER_COLOR[tier] : "#4a6080";
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dashOffset = CIRC - (pct / 100) * CIRC;

  const displayed = useCountUp(pct, 900);
  const scaledSize = size;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: scaledSize, height: scaledSize }}
    >
      <svg
        width={scaledSize}
        height={scaledSize}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`ring-grad-${tier ?? "none"}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id="ring-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(201,214,223,0.08)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Value arc */}
        {score != null && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={`url(#ring-grad-${tier ?? "none"})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{
              transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              filter: "url(#ring-glow)",
            }}
          />
        )}
      </svg>

      {/* Center content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        {score == null ? (
          <>
            <span className="text-5xl font-black" style={{ color: "#4a6080" }}>
              —
            </span>
            <span className="text-[10px] uppercase tracking-widest mt-2" style={{ color: "#7A90A8" }}>
              Not scored
            </span>
          </>
        ) : (
          <>
            <span
              className="text-6xl font-black leading-none tabular-nums"
              style={{ color }}
            >
              {displayed}
            </span>
            <span className="text-[10px] uppercase tracking-widest mt-2" style={{ color: "#7A90A8" }}>
              / 100
            </span>
            {tier && (
              <span
                className="text-xs uppercase font-bold tracking-[0.2em] mt-3"
                style={{ color }}
              >
                {tier}
              </span>
            )}
            <span
              className="text-[9px] font-bold uppercase tracking-widest mt-2 px-2 py-0.5 rounded-full"
              style={{
                background: mode === "verified" ? "rgba(20,184,166,0.15)" : "rgba(96,165,250,0.15)",
                color: mode === "verified" ? "#14B8A6" : "#60a5fa",
                border: `1px solid ${mode === "verified" ? "rgba(20,184,166,0.4)" : "rgba(96,165,250,0.4)"}`,
              }}
            >
              {mode === "verified" ? "✓ Verified" : "⚡ AI Inferred"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Count-up hook for the integer score. Uses rAF so the animation is
// frame-synced. Re-runs when `target` changes (e.g., mode toggle).
function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const toRef = useRef(target);

  useEffect(() => {
    fromRef.current = value;
    toRef.current = target;
    startRef.current = null;
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const v = Math.round(fromRef.current + (toRef.current - fromRef.current) * eased);
      setValue(v);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
