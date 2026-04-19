// GET /api/og?slug=xxx&score=N&f1=...&f2=...
// Protocol share card. 1200×630 dark-gradient card for quiz/protocol shares.
//
// See comments in /api/og/product/route.tsx for the Satori crash triggers
// that silently produce empty PNGs. This route was hit by one: the
// pattern `<div>{number}<span>/100</span></div>` — a div with mixed text
// and an element child without `display: flex` crashed Satori and returned
// 200 OK with zero bytes. Refactored so every multi-child div is `flex`.

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "---").slice(0, 40);
  const scoreRaw = parseInt(searchParams.get("score") || "0", 10);
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, scoreRaw)) : 0;
  const finding1 = (searchParams.get("f1") || "AI protocol analysis complete.").slice(0, 180);
  const finding2 = (searchParams.get("f2") || "").slice(0, 180);

  const scoreColor =
    score >= 70 ? "#14B8A6" : score >= 50 ? "#f59e0b" : "#f87171";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d2545 60%, #0e3040 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Card */}
        <div
          style={{
            background: "rgba(17, 32, 64, 0.8)",
            border: "1px solid rgba(20, 184, 166, 0.3)",
            borderRadius: 16,
            padding: "48px 56px",
            width: 680,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Header row. V-mark removed — small circled-background glyphs
              are a known Satori crash trigger (same as the scorecard tier
              pill). Wordmark carries enough identity at this size. */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#14B8A6", fontSize: 22, fontWeight: 800, letterSpacing: 6 }}>
              VYVATA
            </div>
            <div style={{ color: "#4a6080", fontSize: 12, letterSpacing: 2 }}>
              #{slug.toUpperCase()}
            </div>
          </div>

          {/* Divider — plain solid-color block, not flex (empty flex rows
              sometimes trip Satori's layout pass). */}
          <div style={{ width: "100%", height: 1, background: "rgba(20, 184, 166, 0.2)" }} />

          {/* Score row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                color: "#8ba0b8",
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Protocol Score
            </div>
            {/* Mixed number + /100: both children are plain divs so the parent
                can stay display:flex without the span-inline trap. */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <div style={{ color: scoreColor, fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ color: "#4a6080", fontSize: 22, fontWeight: 700 }}>
                /100
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: 1, background: "rgba(20, 184, 166, 0.2)" }} />

          {/* Findings */}
          {finding1 && (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  color: "#14B8A6",
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 3,
                }}
              >
                01
              </div>
              <div style={{ color: "#c9d6df", fontSize: 15, lineHeight: 1.5, flex: 1 }}>
                {finding1}
              </div>
            </div>
          )}
          {finding2 && (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  color: "#14B8A6",
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 3,
                }}
              >
                02
              </div>
              <div style={{ color: "#c9d6df", fontSize: 15, lineHeight: 1.5, flex: 1 }}>
                {finding2}
              </div>
            </div>
          )}

          <div style={{ width: "100%", height: 1, background: "rgba(20, 184, 166, 0.2)" }} />

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              color: "#4a6080",
              fontSize: 12,
              letterSpacing: 2,
            }}
          >
            vyvata.com · AI-POWERED HEALTH PROTOCOL ENGINE
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
