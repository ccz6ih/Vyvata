import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowLeft, Award, Beaker, CheckCircle2, ShieldCheck, Sparkles,
  Microscope, Factory, Eye, Leaf, ExternalLink, AlertTriangle, BookOpen,
} from "lucide-react";
import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase";
import { VyvataLogo } from "@/components/VyvataLogo";
import ShareButtons from "@/components/ShareButtons";
import GapReportBlock from "@/components/GapReportBlock";
import ScoreRing from "@/components/scorecard/ScoreRing";
import ScoreHistoryTimeline, { type HistoryPoint } from "@/components/scorecard/ScoreHistoryTimeline";
import RelatedProducts, { type RelatedProduct } from "@/components/scorecard/RelatedProducts";
import ScoreModeToggle from "@/components/scorecard/ScoreModeToggle";
import ScorecardTabs from "@/components/scorecard/ScorecardTabs";
import { calculateGapReport } from "@/lib/scoring/gap-report";
import {
  DIMENSION_CAPS,
  DIMENSION_IDS,
  type DimensionId,
} from "@/lib/scoring/dimension-caps";
import { TIER_COLOR, type Tier } from "@/lib/tokens";
import { getAppBaseUrl } from "@/lib/urls";
import { EVIDENCE_SUMMARIES, type EvidenceSummary } from "@/lib/evidence-summaries";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IngredientRow {
  ingredient_name: string;
  dose: number;
  unit: string;
  form: string | null;
  bioavailability: "high" | "medium" | "low" | null;
  is_proprietary_blend: boolean;
  daily_value_percentage: number | null;
  display_order: number | null;
}

interface CertRow {
  type: string;
  verified: boolean;
  verification_url: string | null;
  certificate_number: string | null;
  expiration_date: string | null;
}

interface ScoreRow {
  integrity_score: number;
  tier: Tier;
  evidence_score: number | null;
  safety_score: number | null;
  formulation_score: number | null;
  manufacturing_score: number | null;
  transparency_score: number | null;
  sustainability_score: number | null;
  scored_at: string;
  is_current: boolean;
  score_mode: "ai_inferred" | "verified";
}

interface ProductData {
  id: string;
  brand: string;
  name: string;
  category: string;
  product_url: string | null;
  image_url: string | null;
  serving_size: string | null;
  servings_per_container: number | null;
  price_usd: number | null;
  price_per_serving: number | null;
  status: string;
  manufacturer: { name: string; country: string | null; website: string | null } | null;
  product_ingredients: IngredientRow[];
  certifications: CertRow[];
}

const CERT_LABELS: Record<string, string> = {
  nsf_sport: "NSF Certified for Sport",
  nsf_gmp: "NSF GMP",
  usp_verified: "USP Verified",
  informed_sport: "Informed Sport",
  informed_choice: "Informed Choice",
  non_gmo: "Non-GMO Project",
  organic_usda: "USDA Organic",
  vegan: "Vegan",
  gluten_free: "Gluten-Free",
  kosher: "Kosher",
  halal: "Halal",
};

interface ComplianceFlag {
  id: string;
  source: string;
  subject: string;
  severity: string;
  issued_date: string | null;
  raw_data: { more_code_info?: string } | null;
}

interface LoadedProduct extends ProductData {
  slug: string;
  manufacturer_id: string | null;
  compliance_flags: ComplianceFlag[];
  // All is_current rows (one per mode, post-score_mode migration).
  currentScores: ScoreRow[];
  // Last ~5 scored_at rows for the current mode, newest-first.
  historyByMode: Record<"ai_inferred" | "verified", ScoreRow[]>;
  related: RelatedProduct[];
}

async function loadProduct(slugOrId: string): Promise<LoadedProduct | null> {
  const supabase = getSupabaseServer();
  const lookupColumn = UUID_RE.test(slugOrId) ? "id" : "slug";

  const { data, error } = await supabase
    .from("products")
    .select(`
      id, slug, brand, name, category, product_url, image_url, serving_size,
      servings_per_container, price_usd, price_per_serving, status, manufacturer_id,
      manufacturer:manufacturers (name, country, website),
      product_ingredients (ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend, daily_value_percentage, display_order),
      certifications (type, verified, verification_url, certificate_number, expiration_date),
      product_scores (integrity_score, tier, evidence_score, safety_score, formulation_score, manufacturing_score, transparency_score, sustainability_score, scored_at, is_current, score_mode)
    `)
    .eq(lookupColumn, slugOrId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const raw = data as unknown as ProductData & {
    id: string;
    slug: string;
    manufacturer_id: string | null;
    product_scores: ScoreRow[];
  };

  const currentScores = (raw.product_scores ?? []).filter((s) => s.is_current);

  // Parallel secondary loads: flags, score history, related products.
  const orClauses = raw.manufacturer_id
    ? `matched_product_id.eq.${raw.id},matched_manufacturer_id.eq.${raw.manufacturer_id}`
    : `matched_product_id.eq.${raw.id}`;

  const [flagsRes, historyRes, relatedRes] = await Promise.all([
    supabase
      .from("compliance_flags")
      .select("id, source, subject, severity, issued_date, raw_data")
      .is("resolved_at", null)
      .or(orClauses)
      .order("issued_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("product_scores")
      .select("integrity_score, tier, scored_at, score_mode")
      .eq("product_id", raw.id)
      .order("scored_at", { ascending: false })
      .limit(20),
    loadRelated(supabase, raw.id, raw.category),
  ]);

  const history = (historyRes.data ?? []) as unknown as ScoreRow[];
  const historyByMode: Record<"ai_inferred" | "verified", ScoreRow[]> = {
    ai_inferred: history.filter((h) => h.score_mode === "ai_inferred").slice(0, 5),
    verified: history.filter((h) => h.score_mode === "verified").slice(0, 5),
  };

  return {
    ...raw,
    currentScores,
    historyByMode,
    compliance_flags: (flagsRes.data ?? []) as unknown as ComplianceFlag[],
    related: relatedRes,
  };
}

async function loadRelated(
  supabase: ReturnType<typeof getSupabaseServer>,
  excludeId: string,
  category: string
): Promise<RelatedProduct[]> {
  // Prefer verified; fall back to ai_inferred if the category is sparse.
  // Filter products in JS because PostgREST can't `!inner` join + order by
  // the joined score cleanly when we also need to exclude the current row.
  const { data } = await supabase
    .from("products")
    .select(`
      id, slug, brand, name, category,
      product_scores (integrity_score, tier, is_current, score_mode)
    `)
    .eq("status", "active")
    .eq("category", category)
    .neq("id", excludeId)
    .limit(20);

  type Row = {
    id: string;
    slug: string | null;
    brand: string;
    name: string;
    product_scores: Array<{
      integrity_score: number;
      tier: Tier;
      is_current: boolean;
      score_mode: "ai_inferred" | "verified";
    }>;
  };

  const rows = (data ?? []) as Row[];
  const scored = rows
    .map((r) => {
      const current = r.product_scores.filter((s) => s.is_current);
      const preferred =
        current.find((s) => s.score_mode === "verified") ??
        current.find((s) => s.score_mode === "ai_inferred");
      if (!preferred) return null;
      return {
        id: r.id,
        slug: r.slug,
        brand: r.brand,
        name: r.name,
        integrity_score: preferred.integrity_score,
        tier: preferred.tier,
        score_mode: preferred.score_mode,
      } satisfies RelatedProduct;
    })
    .filter((r): r is RelatedProduct => r !== null)
    .sort((a, b) => b.integrity_score - a.integrity_score)
    .slice(0, 3);

  return scored;
}

/**
 * Pick the score row to render based on URL param + availability.
 * ?mode=ai forces ai_inferred; otherwise default to verified when present.
 */
function pickActiveScore(
  currentScores: ScoreRow[],
  modeParam: string | undefined
): ScoreRow | null {
  const ai = currentScores.find((s) => s.score_mode === "ai_inferred");
  const verified = currentScores.find((s) => s.score_mode === "verified");
  if (modeParam === "ai" && ai) return ai;
  return verified ?? ai ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Product not found · Vyvata" };
  const score = pickActiveScore(product.currentScores, undefined);

  const base = getAppBaseUrl();
  const canonicalUrl = `${base}/products/${product.slug}`;
  const ogUrl = `${base}/api/og/product?slug=${encodeURIComponent(product.slug)}`;

  const title = score
    ? `${product.brand} ${product.name} — Vyvata ${score.integrity_score}/100 (${score.tier})`
    : `${product.brand} ${product.name} · Vyvata`;
  const description = score
    ? `Vyvata integrity score ${score.integrity_score}/100 (${score.tier}). Evidence-graded analysis of ${product.brand} ${product.name}.`
    : `Vyvata-analysed product: ${product.brand} ${product.name}.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title, description, type: "article", siteName: "Vyvata", url: canonicalUrl,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image", title, description, images: [ogUrl],
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { mode: modeParam } = await searchParams;
  const product = await loadProduct(slug);
  if (!product) notFound();

  // Legacy UUID → canonical slug redirect.
  if (UUID_RE.test(slug) && product.slug && product.slug !== slug) {
    permanentRedirect(`/products/${product.slug}`);
  }

  const ai = product.currentScores.find((s) => s.score_mode === "ai_inferred") ?? null;
  const verified = product.currentScores.find((s) => s.score_mode === "verified") ?? null;
  const score = pickActiveScore(product.currentScores, modeParam);
  const hasBothModes = ai && verified;

  const activeMode: "ai_inferred" | "verified" = score?.score_mode ?? "ai_inferred";
  const history = product.historyByMode[activeMode];

  const tierColor = score ? TIER_COLOR[score.tier] : "#4a6080";
  const verifiedCerts = product.certifications.filter((c) => c.verified);
  const ingredients = [...product.product_ingredients].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  // Evidence summaries matching any of this product's ingredients.
  const matchingEvidence = findMatchingEvidence(ingredients);

  // Gap report only meaningful on ai_inferred.
  const gapReport =
    score && activeMode === "ai_inferred"
      ? calculateGapReport(score.integrity_score, {
          evidence: score.evidence_score ?? 0,
          safety: score.safety_score ?? 0,
          formulation: score.formulation_score ?? 0,
          manufacturing: score.manufacturing_score ?? 0,
          transparency: score.transparency_score ?? 0,
          sustainability: score.sustainability_score ?? 0,
        })
      : null;

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* NAV */}
      <header
        className="px-6 py-4 border-b flex items-center justify-between max-w-5xl mx-auto"
        style={{ borderColor: "rgba(201,214,223,0.08)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <VyvataLogo size={22} />
          <span className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Vyvata
          </span>
        </Link>
        <Link href="/products" className="flex items-center gap-1.5 text-xs" style={{ color: "#7A90A8" }}>
          <ArrowLeft size={12} /> All products
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── Hero: identity + score ring ── */}
        <section className="grid md:grid-cols-[1fr_260px] gap-8 items-center">
          <div className="space-y-3 order-2 md:order-1">
            <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
              {product.category.toUpperCase()}
            </p>
            <h1
              className="text-3xl md:text-4xl font-black text-white leading-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {product.brand}
              <br />
              <span style={{ color: "#C9D6DF" }}>{product.name}</span>
            </h1>
            {product.manufacturer && (
              <p className="text-xs" style={{ color: "#7A90A8" }}>
                Manufactured by {product.manufacturer.name}
                {product.manufacturer.country && ` · ${product.manufacturer.country}`}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {product.serving_size && <Chip>{product.serving_size}</Chip>}
              {product.servings_per_container && (
                <Chip>{product.servings_per_container} servings</Chip>
              )}
              {product.price_per_serving != null && (
                <Chip>${Number(product.price_per_serving).toFixed(2)}/serving</Chip>
              )}
              {verifiedCerts.slice(0, 3).map((c) => (
                <span
                  key={c.type}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(20,184,166,0.1)",
                    border: "1px solid rgba(20,184,166,0.3)",
                    color: "#14B8A6",
                  }}
                >
                  <Award size={10} />
                  {CERT_LABELS[c.type] ?? c.type}
                </span>
              ))}
            </div>

            {hasBothModes && ai && verified && (
              <div className="pt-2">
                <ScoreModeToggle
                  aiIntegrity={ai.integrity_score}
                  verifiedIntegrity={verified.integrity_score}
                  activeMode={activeMode}
                />
              </div>
            )}

            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs pt-1"
                style={{ color: "#14B8A6" }}
              >
                <ExternalLink size={11} />
                Manufacturer page
              </a>
            )}
          </div>

          <div className="order-1 md:order-2 flex justify-center md:justify-end">
            <ScoreRing
              score={score?.integrity_score ?? null}
              tier={score?.tier ?? null}
              mode={activeMode}
            />
          </div>
        </section>

        {/* ── Score history (only if ≥ 2 historical points for the active mode) ── */}
        <ScoreHistoryTimeline history={history as unknown as HistoryPoint[]} />

        {/* ── Compliance flags banner ── */}
        {product.compliance_flags.length > 0 && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: "#F87171" }} />
              <p className="text-sm font-bold" style={{ color: "#FCA5A5", fontFamily: "Montserrat, sans-serif" }}>
                {product.compliance_flags.length} FDA enforcement{" "}
                {product.compliance_flags.length === 1 ? "action" : "actions"} on record
              </p>
            </div>
            <div className="space-y-1.5">
              {product.compliance_flags.slice(0, 5).map((f) => (
                <div key={f.id} className="flex items-start gap-2 text-xs" style={{ color: "#C9D6DF" }}>
                  <span
                    className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-semibold"
                    style={{ background: "rgba(248,113,113,0.15)", color: "#F87171" }}
                  >
                    {f.severity}
                  </span>
                  <span className="flex-1">
                    {f.issued_date && <span style={{ color: "#7A90A8" }}>{f.issued_date} · </span>}
                    {f.subject}
                  </span>
                </div>
              ))}
              {product.compliance_flags.length > 5 && (
                <p className="text-xs pt-1" style={{ color: "#7A90A8" }}>
                  + {product.compliance_flags.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        {score && (
          <ScorecardTabs
            overview={<OverviewPanel score={score} tierColor={tierColor} />}
            evidence={<EvidencePanel evidence={matchingEvidence} ingredients={ingredients} />}
            formulation={<FormulationPanel ingredients={ingredients} servingSize={product.serving_size} />}
            sources={<DataSourcesPanel />}
          />
        )}

        {/* ── Gap Report (AI-inferred + upside) ── */}
        {gapReport && (
          <GapReportBlock
            report={gapReport}
            brand={product.brand}
            productName={product.name}
            slug={product.slug}
          />
        )}

        {/* ── Related products ── */}
        <RelatedProducts category={product.category} products={product.related} />

        {/* ── Share ── */}
        <div className="pt-2 space-y-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#7A90A8" }}>
            Share this scorecard
          </p>
          <ShareButtons
            url={`/products/${product.slug}`}
            label={
              score
                ? `${product.brand} ${product.name} scores ${score.integrity_score}/100 (${score.tier}) on the Vyvata Standards Framework.`
                : `Check out ${product.brand} ${product.name} on Vyvata.`
            }
          />
        </div>

        <p className="text-center text-xs pb-6" style={{ color: "#4a6080" }}>
          <Sparkles size={10} className="inline mr-1" style={{ color: "#14B8A6" }} />
          Vyvata scores are structure/function observations only. Not medical advice.
        </p>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab panels (server-rendered JSX trees passed into ScorecardTabs as children)
// ─────────────────────────────────────────────────────────────────────────────

function OverviewPanel({ score, tierColor }: { score: ScoreRow; tierColor: string }) {
  const dims: Array<{ label: string; icon: React.ReactNode; value: number | null; weight: number }> = [
    { label: "Evidence", icon: <Microscope size={13} />, value: score.evidence_score, weight: 25 },
    { label: "Safety", icon: <ShieldCheck size={13} />, value: score.safety_score, weight: 15 },
    { label: "Formulation", icon: <Beaker size={13} />, value: score.formulation_score, weight: 20 },
    { label: "Manufacturing", icon: <Factory size={13} />, value: score.manufacturing_score, weight: 20 },
    { label: "Transparency", icon: <Eye size={13} />, value: score.transparency_score, weight: 12 },
    { label: "Sustainability", icon: <Leaf size={13} />, value: score.sustainability_score, weight: 8 },
  ];
  return (
    <Panel title="How this score was built" subtitle="6 dimensions, weighted & combined">
      <div className="space-y-3">
        {dims.map((d) => (
          <DimensionBar key={d.label} {...d} tierColor={tierColor} />
        ))}
      </div>
    </Panel>
  );
}

function EvidencePanel({
  evidence,
  ingredients,
}: {
  evidence: EvidenceSummary[];
  ingredients: IngredientRow[];
}) {
  if (evidence.length === 0) {
    return (
      <Panel
        title="Clinical evidence"
        subtitle={`${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"} in this formula`}
      >
        <p className="text-sm" style={{ color: "#7A90A8" }}>
          No matching evidence summaries in our library yet for this product&apos;s
          ingredients. Evidence scores are derived from the public literature
          and weighted by RCT quality; see the Data Sources tab for details.
        </p>
      </Panel>
    );
  }
  return (
    <Panel
      title="Clinical evidence"
      subtitle={`${evidence.length} summar${evidence.length === 1 ? "y" : "ies"} matching this formula`}
    >
      <div className="space-y-3">
        {evidence.slice(0, 4).map((e) => (
          <div
            key={e.id}
            className="rounded-xl p-4 space-y-2"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {e.title}
              </p>
              <span
                className="shrink-0 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: e.evidenceTier === "strong"
                    ? "rgba(52,211,153,0.12)"
                    : e.evidenceTier === "moderate"
                    ? "rgba(96,165,250,0.12)"
                    : "rgba(245,158,11,0.12)",
                  color: e.evidenceTier === "strong"
                    ? "#34D399"
                    : e.evidenceTier === "moderate"
                    ? "#60a5fa"
                    : "#F59E0B",
                }}
              >
                {e.evidenceTier}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#C9D6DF" }}>
              {e.summary}
            </p>
            {e.citations.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <BookOpen size={10} style={{ color: "#7A90A8" }} />
                {e.citations.slice(0, 3).map((c, i) => (
                  <a
                    key={i}
                    href={c.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/` : c.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] underline-offset-2 hover:underline"
                    style={{ color: "#7A90A8" }}
                  >
                    {c.source.slice(0, 40)}
                    {c.year ? ` (${c.year})` : ""}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FormulationPanel({
  ingredients,
  servingSize,
}: {
  ingredients: IngredientRow[];
  servingSize: string | null;
}) {
  return (
    <Panel
      title="Supplement Facts"
      subtitle={`${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"} per ${servingSize ?? "serving"}`}
    >
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,214,223,0.08)" }}>
        {ingredients.map((ing, i) => (
          <div
            key={`${ing.ingredient_name}-${i}`}
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: i % 2 === 0 ? "rgba(17,32,64,0.4)" : "rgba(17,32,64,0.6)",
              borderBottom: i < ingredients.length - 1 ? "1px solid rgba(201,214,223,0.04)" : "none",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {ing.ingredient_name}
                {ing.form && (
                  <span className="ml-1.5 font-normal" style={{ color: "#7A90A8" }}>
                    ({ing.form})
                  </span>
                )}
                {ing.is_proprietary_blend && (
                  <span
                    className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#F87171" }}
                  >
                    proprietary blend
                  </span>
                )}
              </p>
              {ing.bioavailability && (
                <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>
                  Bioavailability:{" "}
                  <span style={{ color: bioaColor(ing.bioavailability) }}>
                    {ing.bioavailability}
                  </span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-sm font-semibold text-white tabular-nums"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {ing.dose} {ing.unit}
              </p>
              {ing.daily_value_percentage != null && (
                <p className="text-xs" style={{ color: "#7A90A8" }}>
                  {ing.daily_value_percentage}% DV
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DataSourcesPanel() {
  return (
    <Panel
      title="How we score"
      subtitle="Per-dimension public sources and what brand submission unlocks"
    >
      <div className="space-y-3">
        {DIMENSION_IDS.map((id) => {
          const cap = DIMENSION_CAPS[id];
          return (
            <div
              key={id}
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(17,32,64,0.4)", border: "1px solid rgba(201,214,223,0.08)" }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  {cap.label}
                </p>
                <p className="text-[10px] tabular-nums" style={{ color: "#7A90A8" }}>
                  <span style={{ color: "#60a5fa" }}>{cap.publicMax}</span>
                  {" / "}
                  <span style={{ color: "#14B8A6" }}>{cap.weight}</span>
                  {" pts"}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <SourceList title="Public sources" tone="blue" items={cap.publicSources} />
                <SourceList title="Intake (brand submits)" tone="teal" items={cap.intakeSources} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-xl p-4 mt-4 text-xs leading-relaxed"
        style={{
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.2)",
          color: "#C9D6DF",
        }}
      >
        <strong style={{ color: "#a78bfa", fontFamily: "Montserrat, sans-serif" }}>
          Zero-Assumption Rule:
        </strong>{" "}
        If a score component cannot be derived deterministically from a public
        source, it scores zero until the brand submits. We never assume in the
        brand&apos;s favor — opacity is penalized by absence of data, not excused by it.
      </div>
    </Panel>
  );
}

function SourceList({
  title, tone, items,
}: {
  title: string;
  tone: "blue" | "teal";
  items: string[];
}) {
  const color = tone === "blue" ? "#60a5fa" : "#14B8A6";
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s} className="flex items-start gap-1.5 text-xs" style={{ color: "#C9D6DF" }}>
            <CheckCircle2 size={11} style={{ color, flexShrink: 0, marginTop: 2 }} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Small UI helpers ─────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(201,214,223,0.08)",
        color: "#C9D6DF",
      }}
    >
      {children}
    </span>
  );
}

function Panel({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function DimensionBar({
  label, icon, value, weight, tierColor,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  weight: number;
  tierColor: string;
}) {
  const v = value ?? 0;
  const color = v >= 80 ? "#34D399" : v >= 60 ? "#14B8A6" : v >= 40 ? "#F59E0B" : "#F87171";
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 flex items-center gap-2 text-xs" style={{ color: "#C9D6DF" }}>
        <span style={{ color: tierColor }}>{icon}</span>
        {label}
        <span className="text-[10px]" style={{ color: "#4a6080" }}>
          {weight}%
        </span>
      </div>
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(201,214,223,0.06)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, v)}%`, background: color }}
        />
      </div>
      <div
        className="w-10 text-right text-xs tabular-nums font-semibold"
        style={{ color: v === 0 ? "#4a6080" : color }}
      >
        {value == null ? "—" : Math.round(v)}
      </div>
    </div>
  );
}

function bioaColor(bioa: string): string {
  if (bioa === "high") return "#34D399";
  if (bioa === "medium") return "#F59E0B";
  return "#F87171";
}

function findMatchingEvidence(ingredients: IngredientRow[]): EvidenceSummary[] {
  const names = new Set(
    ingredients.map((i) => i.ingredient_name.toLowerCase().trim())
  );
  const matched: EvidenceSummary[] = [];
  for (const summary of EVIDENCE_SUMMARIES) {
    if (summary.category !== "ingredient") continue;
    if (!summary.relatedIngredients || summary.relatedIngredients.length === 0) continue;
    const hit = summary.relatedIngredients.some((r) =>
      names.has(r.toLowerCase().trim()) ||
      [...names].some((n) => n.includes(r.toLowerCase()) || r.toLowerCase().includes(n))
    );
    if (hit) matched.push(summary);
  }
  return matched;
}
