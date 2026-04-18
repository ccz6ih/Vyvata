// GET /api/og?slug=xxx
// Generates a Vyvata-branded OG image for social sharing

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "---";
  const score = parseInt(searchParams.get("score") || "0");
  const finding1 = searchParams.get("f1") || "AI protocol analysis complete.";
  const finding2 = searchParams.get("f2") || "";

  const scoreColor = score >= 70 ? "#14B8A6" : score >= 50 ? "#f59e0b" : "#f87171";

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
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Vyvata V mark */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(20, 184, 166, 0.15)",
                  border: "2px solid #14B8A6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#14B8A6",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                V
              </div>
              <div style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>
                VYVATA
              </div>
            </div>
            <div style={{ color: "#4a6080", fontSize: 12, letterSpacing: "0.1em" }}>#{slug.toUpperCase()}</div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(20, 184, 166, 0.2)", margin: "0 0" }} />

          {/* Score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ color: "#8ba0b8", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              PROTOCOL SCORE
            </div>
            <div style={{ color: scoreColor, fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
              {score}
              <span style={{ fontSize: 22, color: "#4a6080" }}>/100</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(20, 184, 166, 0.2)" }} />

          {/* Findings */}
          {finding1 && (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ color: "#14B8A6", fontSize: 12, marginTop: 3, fontWeight: 700 }}>01</span>
              <p style={{ color: "#c9d6df", fontSize: 15, lineHeight: 1.5, margin: 0, flex: 1 }}>{finding1}</p>
            </div>
          )}
          {finding2 && (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ color: "#14B8A6", fontSize: 12, marginTop: 3, fontWeight: 700 }}>02</span>
              <p style={{ color: "#c9d6df", fontSize: 15, lineHeight: 1.5, margin: 0, flex: 1 }}>{finding2}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: "1px solid rgba(20, 184, 166, 0.2)", paddingTop: 16 }}>
            <div style={{ color: "#4a6080", fontSize: 12, letterSpacing: "0.1em", textAlign: "center" }}>
              vyvata.com · AI-POWERED HEALTH PROTOCOL ENGINE
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
