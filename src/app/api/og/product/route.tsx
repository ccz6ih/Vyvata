// GET /api/og/product?slug=thorne-magnesium-bisglycinate  (or ?id=<uuid>)
// Trading-card style OG image for product scorecards. Dark Vyvata gradient,
// left: big tier seal + score. Right: brand / name + 6 dimension bars.
// Footer: red compliance pill (if active flags), VYVATA tier wordmark.
// Matches the visual grammar of /api/og (protocol OG) so shares feel
// consistent across Vyvata surfaces.

import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

// Match src/lib/tokens.ts — can't import in Edge runtime without bundling
// cost, so duplicate the tier palette here and keep in sync by hand.
const TIER_COLOR: Record<string, string> = {
  elite: "#a78bfa",
  verified: "#14B8A6",
  standard: "#F59E0B",
  rejected: "#F87171",
};

interface Row {
  brand: string;
  name: string;
  category: string;
  manufacturer_id: string | null;
  product_scores: Array<{
    integrity_score: number;
    tier: "elite" | "verified" | "standard" | "rejected";
    evidence_score: number | null;
    safety_score: number | null;
    formulation_score: number | null;
    manufacturing_score: number | null;
    transparency_score: number | null;
    sustainability_score: number | null;
    is_current: boolean;
    score_mode: "ai_inferred" | "verified";
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
    .select(`
      brand, name, category, manufacturer_id,
      product_scores (integrity_score, tier, evidence_score, safety_score, formulation_score, manufacturing_score, transparency_score, sustainability_score, is_current, score_mode)
    `)
    .eq("status", "active");
  const finished = slug ? query.eq("slug", slug) : query.eq("id", id!);
  const { data } = await finished.maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row;
  // After the score_mode migration, is_current can be true on one row per
  // mode. Prefer verified; fall back to ai_inferred.
  const currentScores = (row.product_scores ?? []).filter((s) => s.is_current);
  const score =
    currentScores.find((s) => s.score_mode === "verified") ??
    currentScores.find((s) => s.score_mode === "ai_inferred") ??
    null;

  // Active compliance flags (for the red pill)
  const flagQuery = supabase
    .from("compliance_flags")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null)
    .not("match_confidence", "eq", "unmatched");
  // Can't easily run a lookup of product id from just slug without the id;
  // ugrade once slug-first everywhere. For the OG pill, counting by
  // manufacturer is a reasonable signal when we have manufacturer_id.
  const { count } = row.manufacturer_id
    ? await flagQuery.eq("matched_manufacturer_id", row.manufacturer_id)
    : { count: 0 };

  return { row, score, flagCount: count ?? 0 };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = await loadData(url.searchParams);

  const brand = data?.row.brand ?? "Vyvata";
  const name = data?.row.name ?? "Product Scorecard";
  const category = data?.row.category ?? "supplement";
  const score = data?.score ?? null;
  const tierColor = score ? TIER_COLOR[score.tier] : "#4a6080";
  const dimensions = [
    { label: "E", name: "Evidence",       v: score?.evidence_score ?? 0 },
    { label: "S", name: "Safety",         v: score?.safety_score ?? 0 },
    { label: "F", name: "Formulation",    v: score?.formulation_score ?? 0 },
    { label: "M", name: "Manufacturing",  v: score?.manufacturing_score ?? 0 },
    { label: "T", name: "Transparency",   v: score?.transparency_score ?? 0 },
    { label: "Su", name: "Sustainability", v: score?.sustainability_score ?? 0 },
  ];
  const hasFlags = (data?.flagCount ?? 0) > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d2545 60%, #0e3040 100%)",
          display: "flex",
          flexDirection: "column",
          padding: 60,
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
        }}
      >
        {/* Top row: wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#14B8A6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0B1F3B",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 6, color: "#14B8A6" }}>
            VYVATA
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(201,214,223,0.08)",
              border: "1px solid rgba(201,214,223,0.12)",
              color: "#C9D6DF",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {category}
          </div>
        </div>

        {/* Main row: seal + info */}
        <div style={{ marginTop: 40, display: "flex", gap: 48, flex: 1 }}>

          {/* LEFT: tier seal */}
          <div
            style={{
              width: 380,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              background: score ? `${tierColor}14` : "rgba(17,32,64,0.4)",
              border: `2px solid ${tierColor}40`,
              padding: 36,
            }}
          >
            {score ? (
              <>
                <div
                  style={{
                    fontSize: 120,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: tierColor,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {score.integrity_score}
                </div>
                <div style={{ fontSize: 18, color: "#7A90A8", marginTop: 4 }}>
                  /100
                </div>
                <div
                  style={{
                    marginTop: 20,
                    padding: "8px 20px",
                    borderRadius: 999,
                    background: `${tierColor}22`,
                    border: `1px solid ${tierColor}`,
                    color: tierColor,
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                  }}
                >
                  {score.tier}
                </div>
                <div style={{ fontSize: 14, color: "#7A90A8", marginTop: 10, letterSpacing: 3, textTransform: "uppercase" }}>
                  Integrity Score
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 96, fontWeight: 900, color: "#4a6080" }}>—</div>
                <div style={{ fontSize: 16, color: "#7A90A8", marginTop: 8 }}>
                  Not yet scored
                </div>
              </>
            )}
          </div>

          {/* RIGHT: name + bars */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#14B8A6", letterSpacing: "-0.01em" }}>
                {brand}
              </div>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "#E8F0F5",
                }}
              >
                {name}
              </div>
            </div>

            {/* Vertical dimension bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 200 }}>
              {dimensions.map((d) => {
                const v = Math.max(0, Math.min(100, Number(d.v) || 0));
                const fillHeight = (v / 100) * 160;
                return (
                  <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                    <div
                      style={{
                        width: "100%",
                        height: 160,
                        background: "rgba(201,214,223,0.06)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "flex-end",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: fillHeight,
                          background: tierColor,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#C9D6DF" }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: 13, color: "#7A90A8" }}>
                      {Math.round(v)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {hasFlags ? (
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.5)",
                color: "#F87171",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              ⚠ ACTIVE FDA ENFORCEMENT
            </div>
          ) : (
            <div style={{ fontSize: 16, color: "#7A90A8" }}>
              Evidence-graded · Compliance-checked · Vyvata Standards Framework
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 14, color: "#7A90A8", letterSpacing: 2 }}>
            vyvata.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
