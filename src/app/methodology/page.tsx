import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import {
  Shield,
  Eye,
  Beaker,
  Factory,
  Microscope,
  Leaf,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Metadata } from "next";
import {
  DIMENSION_CAPS,
  AI_INFERRED_MAX,
  VERIFIED_MAX,
  TOTAL_INTAKE_BONUS,
  type DimensionId,
} from "@/lib/scoring/dimension-caps";

export const metadata: Metadata = {
  title: "Methodology — How Vyvata Calculates the Integrity Score",
  description:
    "The Vyvata Standards Framework (VSF) grades every supplement on six weighted dimensions. This page documents the sources, weights, tier thresholds, and limitations of the methodology.",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#0B1F3B] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 mb-6">
            <VyvataLogo size={32} />
            <span className="font-semibold">Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Methodology</h1>
          <p className="text-lg text-gray-300">
            How Vyvata calculates the Integrity Score
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300">
            The Vyvata Standards Framework (VSF) grades every supplement on six weighted dimensions.
            This page documents the sources, weights, tier thresholds, and limitations of the methodology.
          </p>
          
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-teal-400" />
              Coming Soon
            </h2>
            <p className="text-gray-300">
              Detailed methodology documentation is under development.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

// ── Icon mapping (strings → components) ───────────────────────
const DIMENSION_ICONS: Record<DimensionId, typeof Microscope> = {
  evidence: Microscope,
  safety: Shield,
  formulation: Beaker,
  manufacturing: Factory,
  transparency: Eye,
  sustainability: Leaf,
};

// Display order — puts the two fully-public dimensions last so the
// reader sees the intake-bonus story progress across dimensions.
const DISPLAY_ORDER: DimensionId[] = [
  "evidence",
  "formulation",
  "manufacturing",
  "safety",
  "transparency",
  "sustainability",
];

// ── Tier thresholds (from src/lib/product-scoring.ts tierFor()) ─
const TIERS = [
  {
    name: "Elite",
    range: "90–100",
    color: "#A78BFA",
    desc: "The highest integrity band. Strong evidence, independently tested, transparent sourcing, and no unresolved regulatory actions.",
  },
  {
    name: "Verified",
    range: "75–89",
    color: "#14B8A6",
    desc: "A credible, well-formulated product with meaningful third-party signals. Practitioner-grade confidence.",
  },
  {
    name: "Standard",
    range: "60–74",
    color: "#34D399",
    desc: "Acceptable but unremarkable. Likely has gaps in transparency, testing, or dose calibration.",
  },
  {
    name: "Rejected",
    range: "0–59",
    color: "#F87171",
    desc: "Missing critical data, proprietary blends hiding dose, unresolved safety signals, or low-evidence ingredient choices.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen" style={{ background: "#0B1F3B" }}>
      {/* Navigation */}
      <nav
        className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto border-b"
        style={{ borderColor: "rgba(201,214,223,0.1)" }}
      >
        <Link href="/" className="flex items-center gap-3">
          <VyvataLogo size={28} />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            Vyvata
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm hover:text-white transition-colors"
          style={{ color: "#C9D6DF" }}
        >
          ← Back to Home
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <p
            className="text-xs font-semibold tracking-widest"
            style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
          >
            METHODOLOGY
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white"
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.02em" }}
          >
            The Vyvata Standards Framework.
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed max-w-3xl"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
          >
            Every supplement on Vyvata is graded on six weighted dimensions that add up to a single 0–100 integrity score. This page documents how the score is computed, where the data comes from, and what the methodology can and cannot do yet.
          </p>
          <p
            className="text-sm"
            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
          >
            Version 1.0 · Last updated April 2026
          </p>
        </div>
      </section>

      {/* The six dimensions — deep-dive */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 space-y-3">
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              The six dimensions.
            </h2>
            <p
              className="text-base max-w-3xl leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Weights are fixed and apply identically to every product. A perfect score is 100. The maximum achievable from public data alone is{" "}
              <strong style={{ color: "#14B8A6" }}>{AI_INFERRED_MAX}</strong>. The remaining{" "}
              <strong style={{ color: "#14B8A6" }}>{TOTAL_INTAKE_BONUS}</strong> points are unlocked when a brand submits documentation and is verified — see the AI Inferred vs Verified section below.
            </p>
          </div>

          <div className="space-y-4">
            {DISPLAY_ORDER.map((id) => {
              const cap = DIMENSION_CAPS[id];
              const Icon = DIMENSION_ICONS[id];
              const fromPublicPct = Math.round((cap.publicMax / cap.weight) * 100);
              return (
                <div
                  key={id}
                  className="rounded-xl p-6 md:p-7"
                  style={{
                    background: "rgba(17, 32, 64, 0.6)",
                    border: "1px solid rgba(201,214,223,0.12)",
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:gap-8 gap-4">
                    {/* Left: icon + weight */}
                    <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-3 shrink-0 md:w-36">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: "rgba(20, 184, 166, 0.12)",
                          border: "1px solid rgba(20, 184, 166, 0.2)",
                        }}
                      >
                        <Icon size={20} color="#14B8A6" />
                      </div>
                      <div style={{ fontFamily: "Montserrat, sans-serif" }}>
                        <div
                          className="text-3xl font-black leading-none"
                          style={{ color: "#14B8A6" }}
                        >
                          {cap.weight}
                        </div>
                        <div
                          className="text-[10px] uppercase tracking-widest mt-1"
                          style={{ color: "#7A90A8" }}
                        >
                          of 100 points
                        </div>
                      </div>
                    </div>

                    {/* Right: content */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3
                          className="text-xl md:text-2xl font-bold text-white mb-2"
                          style={{ fontFamily: "Montserrat, sans-serif" }}
                        >
                          {cap.label}
                        </h3>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                        >
                          {cap.tooltip}
                        </p>
                      </div>

                      {/* Public vs intake bar */}
                      <div className="space-y-2">
                        <div
                          className="h-2 rounded-full overflow-hidden flex"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            style={{
                              background: "#14B8A6",
                              width: `${fromPublicPct}%`,
                            }}
                          />
                          {cap.intakeBonus > 0 && (
                            <div
                              style={{
                                background: "rgba(20, 184, 166, 0.25)",
                                width: `${100 - fromPublicPct}%`,
                              }}
                            />
                          )}
                        </div>
                        <div
                          className="flex items-center justify-between text-xs"
                          style={{ fontFamily: "Inter, sans-serif", color: "#C9D6DF" }}
                        >
                          <span>
                            <strong style={{ color: "#14B8A6" }}>{cap.publicMax}</strong> of {cap.weight} scorable from public data
                          </span>
                          {cap.intakeBonus > 0 ? (
                            <span style={{ color: "#7A90A8" }}>
                              +{cap.intakeBonus} with brand submission
                            </span>
                          ) : (
                            <span style={{ color: "#7A90A8" }}>
                              No submission bonus — fully public
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sources */}
                      <div className="grid md:grid-cols-2 gap-3">
                        <div
                          className="rounded-lg p-4 space-y-2"
                          style={{
                            background: "rgba(20, 184, 166, 0.05)",
                            border: "1px solid rgba(20, 184, 166, 0.15)",
                          }}
                        >
                          <div
                            className="text-[10px] uppercase tracking-widest font-semibold"
                            style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
                          >
                            Public sources
                          </div>
                          <ul
                            className="text-sm space-y-1"
                            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                          >
                            {cap.publicSources.map((s) => (
                              <li key={s}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div
                          className="rounded-lg p-4 space-y-2"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(201,214,223,0.1)",
                          }}
                        >
                          <div
                            className="text-[10px] uppercase tracking-widest font-semibold"
                            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                          >
                            {cap.intakeBonus > 0 ? "Unlocks with submission" : "No additional sources"}
                          </div>
                          <ul
                            className="text-sm space-y-1"
                            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                          >
                            {cap.intakeSources.length > 0 ? (
                              cap.intakeSources.map((s) => <li key={s}>• {s}</li>)
                            ) : (
                              <li>• All signals already captured from public data</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Inferred vs Verified */}
      <section className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              TWO MODES OF SCORING
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              AI Inferred vs Verified.
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Every product on Vyvata receives an <strong style={{ color: "#14B8A6" }}>AI Inferred</strong> score derived entirely from public data. Brands that submit documentation unlock a <strong style={{ color: "#14B8A6" }}>Verified</strong> score with access to the remaining {TOTAL_INTAKE_BONUS} points.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div
              className="rounded-xl p-6 space-y-4"
              style={{
                background: "rgba(96,165,250,0.05)",
                border: "1px solid rgba(96,165,250,0.25)",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                  style={{
                    background: "rgba(96,165,250,0.15)",
                    color: "#60a5fa",
                    border: "1px solid rgba(96,165,250,0.4)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  ⚡ AI Inferred
                </span>
                <span
                  className="text-2xl font-black"
                  style={{ color: "#60a5fa", fontFamily: "Montserrat, sans-serif" }}
                >
                  Max {AI_INFERRED_MAX}
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
              >
                The default score for every product in our database. Computed from public federal registries, label data, and peer-reviewed literature. No brand participation required.
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                A brand cannot opt out by staying quiet. Missing data scores zero in this mode, not neutral.
              </p>
            </div>

            <div
              className="rounded-xl p-6 space-y-4"
              style={{
                background: "rgba(20,184,166,0.05)",
                border: "1px solid rgba(20,184,166,0.3)",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                  style={{
                    background: "rgba(20,184,166,0.15)",
                    color: "#14B8A6",
                    border: "1px solid rgba(20,184,166,0.4)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  ✓ Verified
                </span>
                <span
                  className="text-2xl font-black"
                  style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
                >
                  Max {VERIFIED_MAX}
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
              >
                Unlocked when a brand submits documentation — CoAs, facility audits, sourcing records, clinical affiliate disclosures — and it passes human review.
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                Submission is free. Verification is not pay-to-play. A Verified mode does not guarantee a higher score — it unlocks the ceiling.
              </p>
            </div>
          </div>

          <div
            className="rounded-lg p-4 text-sm flex items-start gap-3"
            style={{
              background: "rgba(20, 184, 166, 0.04)",
              border: "1px solid rgba(20, 184, 166, 0.15)",
              color: "#C9D6DF",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <CheckCircle2 size={18} color="#14B8A6" className="shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">The math is identical across modes.</strong> Only the weight each dimension can contribute changes. The raw dimension score (e.g. "Manufacturing: 88/100") is the same regardless of mode.
            </div>
          </div>
        </div>
      </section>

      {/* Tier thresholds */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              TIER THRESHOLDS
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              How a score becomes a tier.
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Tier thresholds are fixed. A product does not move up a tier because peer products moved down; the score must earn the tier on absolute terms.
            </p>
          </div>

          <div className="space-y-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4"
                style={{
                  background: "rgba(17, 32, 64, 0.5)",
                  border: `1px solid ${t.color}30`,
                }}
              >
                <div className="flex items-center gap-4 md:w-56 shrink-0">
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${t.color}15`, border: `1px solid ${t.color}40` }}
                  >
                    <span
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: t.color, fontFamily: "Montserrat, sans-serif" }}
                    >
                      {t.name.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: t.color, fontFamily: "Montserrat, sans-serif" }}
                    >
                      {t.name}
                    </div>
                    <div
                      className="text-xs uppercase tracking-wider tabular-nums"
                      style={{ color: "#7A90A8", fontFamily: "Montserrat, sans-serif" }}
                    >
                      {t.range}
                    </div>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                >
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Living documents / when scores change */}
      <section className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              SCORES ARE LIVING DOCUMENTS
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              When scores change.
            </h2>
          </div>
          <p
            className="text-base leading-relaxed"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
          >
            Every score on Vyvata is timestamped. When any of the underlying signals changes, the score re-computes and a new version is written. Previous versions are preserved — scorecards show the history.
          </p>

          <ul
            className="space-y-3 text-sm leading-relaxed"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
          >
            {[
              "A new FDA warning letter, recall, or import alert lands in openFDA",
              "A certification is added or withdrawn from NSF, USP, or Informed Sport",
              "The label data in NIH DSLD is updated",
              "A brand's submission is approved, rejected, or withdrawn",
              "A tier threshold or dimension weight is revised (this is versioned — see the changelog)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(20, 184, 166, 0.15)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2 2 4-4"
                      stroke="#14B8A6"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Honest limitations */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#F59E0B", fontFamily: "Inter, sans-serif" }}
            >
              HONEST LIMITATIONS
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              What VSF does not measure yet.
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              No scoring system captures everything that matters. These are the gaps we know about today, documented publicly so they're not presented as features.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "Real-world outcomes",
                body: "VSF grades the product, not whether it worked for the person taking it. Outcome correlation across our audit base is on the roadmap but not yet shipped.",
              },
              {
                title: "Batch-level variation",
                body: "Scores are product-level. Lot-level contamination or potency variation is captured only when a recall or warning letter names a specific batch.",
              },
              {
                title: "Non-US regulatory signals",
                body: "The Safety dimension currently leans on US FDA sources. EU (EFSA), Canada (Health Canada), and Australia (TGA) integration is planned but not yet live.",
              },
              {
                title: "Price and value",
                body: "VSF grades integrity, not value-for-money. Two products with the same score may differ in price by an order of magnitude.",
              },
              {
                title: "Taste, adherence, patient preference",
                body: "Important but unscorable from registry data. Practitioners bring this judgment to the protocol.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg p-5 flex items-start gap-4"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(201, 214, 223, 0.1)",
                }}
              >
                <AlertCircle size={18} color="#F59E0B" className="shrink-0 mt-0.5" />
                <div>
                  <h3
                    className="font-bold text-white text-sm mb-1"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                  >
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance / the six principles */}
      <section className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              GOVERNANCE
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              The Vyvata Standards.
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Six principles govern how Vyvata operates. They are versioned on this page. Any change to them is a change to the methodology, and will appear in the changelog below.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { n: "1", t: "Verify what's claimed", d: "Every claim checked against evidence." },
              { n: "2", t: "Yield nothing to opacity", d: "Missing data scores zero, not neutral." },
              { n: "3", t: "Validate against evidence", d: "PubMed, FDA, NSF, USP — not marketing copy." },
              { n: "4", t: "Audit continuously", d: "Scores are living documents. When evidence changes, scores change." },
              { n: "5", t: "Trust, earned — not given", d: "No pay-to-play. No sponsored rankings." },
              { n: "6", t: "Accountability to the consumer, always", d: "Vyvata's customer is the person reading the score, not the brand being scored." },
            ].map((p) => (
              <div
                key={p.n}
                className="p-5 rounded-xl"
                style={{
                  background: "rgba(20, 184, 166, 0.05)",
                  border: "1px solid rgba(20, 184, 166, 0.2)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                    style={{
                      background: "#14B8A6",
                      color: "#0B1F3B",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {p.n}
                  </div>
                  <div className="space-y-1">
                    <h3
                      className="text-base font-bold text-white"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {p.t}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                    >
                      {p.d}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Changelog */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              METHODOLOGY CHANGELOG
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Versioned in public.
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Every revision to dimension weights, tier thresholds, or governance commitments is documented here. Scores computed under older versions are preserved and labelled with the version they used.
            </p>
          </div>

          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17, 32, 64, 0.5)",
              border: "1px solid rgba(201,214,223,0.12)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-xs font-bold px-2 py-1 rounded-full"
                style={{
                  background: "rgba(20, 184, 166, 0.15)",
                  color: "#14B8A6",
                  border: "1px solid rgba(20, 184, 166, 0.3)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                v1.0 — Current
              </span>
              <span
                className="text-xs"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                April 2026
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Initial public release. Six dimensions with weights Evidence 25 / Formulation 20 / Manufacturing 20 / Safety 15 / Transparency 12 / Sustainability 8. Tier thresholds 60 / 75 / 90. AI Inferred and Verified modes active.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-6 py-20 text-center"
        style={{
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d3d38 100%)",
          borderTop: "1px solid rgba(20, 184, 166, 0.1)",
        }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <h2
            className="text-3xl md:text-4xl font-black text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            See the methodology in action.
          </h2>
          <p
            className="text-base"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
          >
            Every scorecard shows how each dimension contributed to the final number.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base btn-teal"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Browse the scores
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-12 border-t"
        style={{ borderColor: "rgba(201,214,223,0.1)" }}
      >
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <VyvataLogo size={24} />
            <span
              className="text-base font-bold"
              style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}
            >
              Vyvata
            </span>
          </div>
          <p
            className="text-sm max-w-2xl mx-auto"
            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
          >
            The independent integrity score for what you put in your body.
          </p>
          <div
            className="flex items-center justify-center gap-6 text-xs"
            style={{ color: "#7A90A8" }}
          >
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/products" className="hover:text-white transition-colors">
              Scores
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link
              href="/practitioner"
              className="hover:text-white transition-colors"
            >
              For Practitioners
            </Link>
          </div>
          <p
            className="text-xs pt-4"
            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
          >
            © 2026 Vyvata. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
