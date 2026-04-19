// GET /api/og/product?slug=...
// Minimal trading-card OG image. Kept intentionally simple after repeated
// silent Satori crashes in the richer layout — add features back only with
// verified screenshots of the produced PNG.

import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

// Tier colors as plain hex. Companion TIER_TINT is the low-alpha fill for
// backgrounds — kept as rgba() strings instead of 8-char hex because
// Satori (the engine behind next/og ImageResponse) has documented parser
// flakiness on #RRGGBBAA syntax and silently produces empty output.
const TIER_COLOR: Record<string, string> = {
  elite: "#a78bfa",
  verified: "#14B8A6",
  standard: "#F59E0B",
  rejected: "#F87171",
};
const TIER_TINT: Record<string, string> = {
  elite: "rgba(167,139,250,0.14)",
  verified: "rgba(20,184,166,0.14)",
  standard: "rgba(245,158,11,0.14)",
  rejected: "rgba(248,113,113,0.14)",
};

interface Row {
  brand: string;
  name: string;
  category: string;
  product_scores: Array<{
    integrity_score: number;
    tier: "elite" | "verified" | "standard" | "rejected";
    is_current: boolean;
  }>;
}

async function loadData(params: URLSearchParams) {
  const slug = params.get("slug");
  const id = params.get("id");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || (!slug && !id)) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const query = supabase
    .from("products")
    .select("brand, name, category, product_scores(integrity_score, tier, is_current)")
    .eq("status", "active");
  const finished = slug ? query.eq("slug", slug) : query.eq("id", id!);
  const { data } = await finished.maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row;
  const currentScore = row.product_scores?.find((s) => s.is_current) ?? null;
  return { row, score: currentScore };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = await loadData(url.searchParams);

  const brand = (data?.row.brand ?? "Vyvata").slice(0, 40);
  const name = (data?.row.name ?? "Product Scorecard").slice(0, 60);
  const category = (data?.row.category ?? "supplement").slice(0, 20);
  // DIAGNOSTIC: ?debug=noscore forces the fallback path even when data
  // exists. Lets us bisect whether the crash is in the score rendering
  // branch or in the real brand/name strings. Remove once the OG 0-byte
  // issue is resolved.
  const debugNoscore = url.searchParams.get("debug") === "noscore";
  const hasScore = !debugNoscore && !!data?.score;
  const intScore = hasScore ? Math.round(Number(data!.score!.integrity_score) || 0) : null;
  const tier = hasScore ? data!.score!.tier : null;
  const tierColor = tier ? TIER_COLOR[tier] ?? "#4a6080" : "#4a6080";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d2545 60%, #0e3040 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
        }}
      >
        {/* Top: wordmark + category */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 6,
              color: "#14B8A6",
            }}
          >
            VYVATA
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 2,
              color: "#C9D6DF",
              textTransform: "uppercase",
            }}
          >
            {category}
          </div>
        </div>

        {/* Middle: identity + score */}
        <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
          {/* Score block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 260,
              height: 260,
              borderRadius: 24,
              background: tier ? TIER_TINT[tier] ?? "rgba(17,32,64,0.5)" : "rgba(17,32,64,0.5)",
              border: `2px solid ${tierColor}`,
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 900,
                lineHeight: 1,
                color: tierColor,
              }}
            >
              {hasScore && intScore != null ? String(intScore) : "—"}
            </div>
            <div style={{ fontSize: 16, color: "#7A90A8", marginTop: 8 }}>
              {hasScore ? "/ 100" : "Not yet scored"}
            </div>
          </div>

          {/* Identity */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#14B8A6" }}>
              {brand}
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1.1,
                color: "#E8F0F5",
                marginTop: 6,
              }}
            >
              {name}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 16,
            color: "#7A90A8",
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          Evidence-graded · Compliance-checked · vyvata.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
