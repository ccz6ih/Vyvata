// GET /api/og/product?slug=...
// Trading-card OG image for public product scorecards. 1200×630.
//
// Known-fragile rendering path — Satori (the engine behind next/og) has
// flakiness around specific style combinations and silently produces an
// empty response on crash (200 OK with Content-Length: 0), which social
// scrapers reject as "corrupted image." Things confirmed to trigger the
// silent crash on Vercel Edge + Next 16:
//   - `background: "#RRGGBBAA"` 8-char hex alpha (use rgba() instead)
//   - Small pill: solid-hex background + dark text + `borderRadius: 999`
//     combined — render as plain colored text instead
//   - Small circled glyph: ~36px square with rounded borderRadius +
//     background + border + centered inline text (e.g. a V-mark). Same
//     class as the pill above
//   - Empty flex rows: `<div style={{ display: "flex", height: 1 }} />`
//     as a divider. Use plain block divs without display:flex for thin
//     dividers instead
//   - `<div>{text}<span>{text}</span></div>` mixed text + element
//     children without `display: flex` on the parent
// If you add styling here, verify the PNG renders end-to-end — run
// `npm run smoke:og` post-deploy. A failed render is 0 bytes and
// otherwise invisible. `next build` passes either way.

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
    evidence_score: number | null;
    safety_score: number | null;
    formulation_score: number | null;
    manufacturing_score: number | null;
    transparency_score: number | null;
    sustainability_score: number | null;
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
    .select(
      "brand, name, category, product_scores(integrity_score, tier, evidence_score, safety_score, formulation_score, manufacturing_score, transparency_score, sustainability_score, is_current)"
    )
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
  const hasScore = !!data?.score;
  const intScore = hasScore ? Math.round(Number(data!.score!.integrity_score) || 0) : null;
  const tier = hasScore ? data!.score!.tier : null;
  const tierColor = tier ? TIER_COLOR[tier] ?? "#4a6080" : "#4a6080";

  // Six-segment dimension bar: each segment's color signals its sub-score at
  // a glance. Visible only when scored. Plain solid rectangles — no border-
  // radius / border / padding tricks that could re-trip Satori.
  const s = data?.score;
  const rawDims = s
    ? [s.evidence_score, s.safety_score, s.formulation_score, s.manufacturing_score, s.transparency_score, s.sustainability_score]
    : [];
  const dimSegments = rawDims.map((raw) => {
    const v = Math.max(0, Math.min(100, Number(raw) || 0));
    const color =
      v >= 80 ? "#34D399"
      : v >= 60 ? "#14B8A6"
      : v >= 40 ? "#F59E0B"
      : "#F87171";
    return { v, color };
  });

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
            {/* Eyebrow label — plain text child of the flex column so it
                won't trip the mixed-text+span crash pattern documented
                at the top of this file. `textTransform: uppercase` is
                already used on the category and tier labels without
                incident. */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 4,
                color: "#7A90A8",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Integrity Score
            </div>
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
            {tier && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 4,
                  color: tierColor,
                  textTransform: "uppercase",
                }}
              >
                {tier}
              </div>
            )}
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

            {/* Six-segment dimension bar (E · S · F · M · T · Su) */}
            {dimSegments.length === 6 && (
              <div style={{ display: "flex", marginTop: 20, height: 6, gap: 3 }}>
                {dimSegments.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 6,
                      background: d.color,
                    }}
                  />
                ))}
              </div>
            )}
            {dimSegments.length === 6 && (
              <div
                style={{
                  display: "flex",
                  marginTop: 6,
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: "#7A90A8",
                  textTransform: "uppercase",
                }}
              >
                {["Evidence", "Safety", "Formulation", "Manufacturing", "Transparency", "Sustainability"].map((label) => (
                  <div key={label} style={{ flex: 1, textAlign: "center" }}>
                    {label.slice(0, 3)}
                  </div>
                ))}
              </div>
            )}
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
          Independent integrity scores · Evidence-graded · vyvata.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Edge/CDN caches the image for a day, scraper revalidates every
        // hour, and stale-while-revalidate keeps social crawlers served
        // for a week even if Vercel's edge is repopulating. Default Next
        // cache-control of `max-age=0, must-revalidate` is actively bad
        // for OG — Facebook/LinkedIn scrapers don't retry on cache misses.
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
