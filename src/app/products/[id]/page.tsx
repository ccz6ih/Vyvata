import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Award, Beaker, CheckCircle2, ShieldCheck, Sparkles,
  Microscope, Factory, Eye, Leaf, ExternalLink, AlertTriangle,
} from "lucide-react";
import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase";
import { VyvataLogo } from "@/components/VyvataLogo";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
  tier: "rejected" | "standard" | "verified" | "elite";
  evidence_score: number | null;
  safety_score: number | null;
  formulation_score: number | null;
  manufacturing_score: number | null;
  transparency_score: number | null;
  sustainability_score: number | null;
  scored_at: string;
  is_current: boolean;
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
  product_scores: ScoreRow[];
}

const TIER_COLOR: Record<string, string> = {
  elite: "#34D399",
  verified: "#14B8A6",
  standard: "#F59E0B",
  rejected: "#F87171",
};

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

async function loadProduct(
  id: string
): Promise<(ProductData & { compliance_flags: ComplianceFlag[] }) | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, brand, name, category, product_url, image_url, serving_size,
      servings_per_container, price_usd, price_per_serving, status, manufacturer_id,
      manufacturer:manufacturers (name, country, website),
      product_ingredients (ingredient_name, dose, unit, form, bioavailability, is_proprietary_blend, daily_value_percentage, display_order),
      certifications (type, verified, verification_url, certificate_number, expiration_date),
      product_scores (integrity_score, tier, evidence_score, safety_score, formulation_score, manufacturing_score, transparency_score, sustainability_score, scored_at, is_current)
    `)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const raw = data as unknown as ProductData & {
    manufacturer_id: string | null;
    product_scores: Array<ScoreRow & { is_current: boolean }>;
  };
  const current = raw.product_scores?.filter((s) => s.is_current) ?? [];

  // Compliance flags matched by product or manufacturer (excludes resolved).
  const orClauses = raw.manufacturer_id
    ? `matched_product_id.eq.${id},matched_manufacturer_id.eq.${raw.manufacturer_id}`
    : `matched_product_id.eq.${id}`;
  const { data: flagsData } = await supabase
    .from("compliance_flags")
    .select("id, source, subject, severity, issued_date, raw_data")
    .is("resolved_at", null)
    .or(orClauses)
    .order("issued_date", { ascending: false, nullsFirst: false });

  return {
    ...raw,
    product_scores: current,
    compliance_flags: (flagsData ?? []) as unknown as ComplianceFlag[],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) return { title: "Product not found · Vyvata" };
  const score = product.product_scores[0];
  return {
    title: `${product.brand} ${product.name} · Vyvata`,
    description: score
      ? `Vyvata integrity score ${score.integrity_score}/100 (${score.tier}). Evidence-graded analysis of ${product.brand} ${product.name}.`
      : `Vyvata-analysed product: ${product.brand} ${product.name}.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) notFound();

  const score = product.product_scores[0] ?? null;
  const tierColor = score ? TIER_COLOR[score.tier] : "#4a6080";
  const verifiedCerts = product.certifications.filter((c) => c.verified);
  const ingredients = [...product.product_ingredients].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

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
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "#7A90A8" }}
        >
          <ArrowLeft size={12} /> All products
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── Hero: score tile + identity ── */}
        <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
          <div
            className="rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2"
            style={{
              background: score ? `${tierColor}14` : "rgba(17,32,64,0.6)",
              border: `1px solid ${tierColor}40`,
            }}
          >
            {score ? (
              <>
                <span
                  className="text-6xl font-black leading-none"
                  style={{ color: tierColor, fontFamily: "Montserrat, sans-serif" }}
                >
                  {score.integrity_score}
                </span>
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: tierColor }}>
                  {score.tier}
                </span>
                <span className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "#7A90A8" }}>
                  Integrity Score / 100
                </span>
              </>
            ) : (
              <>
                <span className="text-5xl font-black" style={{ color: "#4a6080", fontFamily: "Montserrat, sans-serif" }}>
                  —
                </span>
                <span className="text-xs" style={{ color: "#7A90A8" }}>Not yet scored</span>
              </>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
              {product.category.toUpperCase()}
            </p>
            <h1 className="text-3xl font-black text-white leading-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
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
              {product.serving_size && (
                <Chip>{product.serving_size}</Chip>
              )}
              {product.servings_per_container && (
                <Chip>{product.servings_per_container} servings</Chip>
              )}
              {product.price_per_serving != null && (
                <Chip>${Number(product.price_per_serving).toFixed(2)}/serving</Chip>
              )}
            </div>
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
        </div>

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
                {product.compliance_flags.length} FDA enforcement {product.compliance_flags.length === 1 ? "action" : "actions"} on record
              </p>
            </div>
            <p className="text-xs" style={{ color: "#C9D6DF" }}>
              Public-domain enforcement data sourced from official US government
              APIs. Vyvata surfaces this so practitioners and patients can make
              informed choices.
            </p>
            <div className="space-y-1.5">
              {product.compliance_flags.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2 text-xs"
                  style={{ color: "#C9D6DF" }}
                >
                  <span
                    className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-semibold"
                    style={{
                      background: "rgba(248,113,113,0.15)",
                      color: "#F87171",
                    }}
                  >
                    {f.severity}
                  </span>
                  <span className="flex-1">
                    {f.issued_date && (
                      <span style={{ color: "#7A90A8" }}>{f.issued_date} · </span>
                    )}
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

        {/* ── Dimension scores ── */}
        {score && (
          <Panel title="How this score was built" subtitle="6 dimensions, weighted & combined">
            <div className="space-y-3">
              <DimensionBar label="Evidence"       icon={<Microscope size={13} />}   value={score.evidence_score}       weight={25} />
              <DimensionBar label="Safety"         icon={<ShieldCheck size={13} />}  value={score.safety_score}         weight={15} />
              <DimensionBar label="Formulation"   icon={<Beaker size={13} />}       value={score.formulation_score}    weight={20} />
              <DimensionBar label="Manufacturing" icon={<Factory size={13} />}      value={score.manufacturing_score}  weight={20} />
              <DimensionBar label="Transparency"  icon={<Eye size={13} />}          value={score.transparency_score}   weight={12} />
              <DimensionBar label="Sustainability" icon={<Leaf size={13} />}        value={score.sustainability_score} weight={8} />
            </div>
          </Panel>
        )}

        {/* ── Certifications ── */}
        {verifiedCerts.length > 0 && (
          <Panel title="Certifications" subtitle="Verified third-party and lifestyle credentials">
            <div className="flex flex-wrap gap-2">
              {verifiedCerts.map((c) => (
                <a
                  key={c.type}
                  href={c.verification_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(20,184,166,0.1)",
                    border: "1px solid rgba(20,184,166,0.3)",
                    color: "#14B8A6",
                  }}
                >
                  <Award size={11} />
                  {CERT_LABELS[c.type] ?? c.type}
                </a>
              ))}
            </div>
          </Panel>
        )}

        {/* ── Ingredients ── */}
        <Panel title="Supplement Facts" subtitle={`${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"} per ${product.serving_size ?? "serving"}`}>
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
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(248,113,113,0.1)", color: "#F87171" }}>
                        proprietary blend
                      </span>
                    )}
                  </p>
                  {ing.bioavailability && (
                    <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>
                      Bioavailability: <span style={{ color: bioaColor(ing.bioavailability) }}>{ing.bioavailability}</span>
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white tabular-nums" style={{ fontFamily: "Montserrat, sans-serif" }}>
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

        {/* ── Disclaimer ── */}
        <p className="text-center text-xs pb-6" style={{ color: "#4a6080" }}>
          <Sparkles size={10} className="inline mr-1" style={{ color: "#14B8A6" }} />
          Vyvata scores are structure/function observations only. Not medical advice.
        </p>
      </div>
    </main>
  );
}

// ── Small components ────────────────────────────────────────────────────────

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

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
          {title}
        </h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function DimensionBar({
  label, icon, value, weight,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  weight: number;
}) {
  const v = value ?? 0;
  const color = v >= 80 ? "#34D399" : v >= 60 ? "#14B8A6" : v >= 40 ? "#F59E0B" : "#F87171";
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 flex items-center gap-2 text-xs" style={{ color: "#C9D6DF" }}>
        <span style={{ color: "#14B8A6" }}>{icon}</span>
        {label}
        <span className="text-[10px]" style={{ color: "#4a6080" }}>{weight}%</span>
      </div>
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(201,214,223,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, v)}%`, background: color }} />
      </div>
      <div className="w-10 text-right text-xs tabular-nums font-semibold" style={{ color: v === 0 ? "#4a6080" : color }}>
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
