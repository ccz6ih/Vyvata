"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  Eye,
  Beaker,
  Factory,
  Microscope,
  Leaf,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import AuthNavLink from "@/components/AuthNavLink";

const PLACEHOLDER = `Energy crashes mid-afternoon
Poor sleep, waking at 3am
Brain fog, can't focus after lunch
Joint inflammation, stress from work
Already taking: Vitamin D3 5000IU, Magnesium, Fish Oil...

Paste your symptoms, goals, or current stack — however you have it.`;

// ── Six VSF dimensions ──────────────────────────────────────────
// Weights and publicMax values are derived from
// src/lib/scoring/dimension-caps.ts. Edit both in lockstep.
// AI-inferred cap across all dimensions: 79/100
// Verified cap: 100/100
const DIMENSIONS = [
  {
    icon: Microscope,
    label: "Evidence Quality",
    weight: 25,
    publicMax: 25,
    desc: "How well the product's primary claims are backed by published clinical research.",
    sources: "PubMed · Cochrane · NCBI meta-analyses",
  },
  {
    icon: Beaker,
    label: "Formulation Integrity",
    weight: 20,
    publicMax: 12,
    desc: "Clinically effective dosing in bioavailable forms, with no hidden proprietary blends.",
    sources: "NIH DSLD · label parsing · blend detection",
  },
  {
    icon: Factory,
    label: "Manufacturing & Purity",
    weight: 20,
    publicMax: 16,
    desc: "GMP compliance, third-party certification, and independent contamination testing.",
    sources: "NSF · USP Verified · Informed Sport registries",
  },
  {
    icon: Shield,
    label: "Safety Profile",
    weight: 15,
    publicMax: 15,
    desc: "Adverse event history, drug interactions, and regulatory action against the brand.",
    sources: "FDA CAERS · openFDA recalls · FDA warning letters",
  },
  {
    icon: Eye,
    label: "Brand Transparency",
    weight: 12,
    publicMax: 7,
    desc: "Honest claims, accessible testing data, and no hidden commercial relationships.",
    sources: "Public website claims · CoA accessibility",
  },
  {
    icon: Leaf,
    label: "Sustainability & Ethics",
    weight: 8,
    publicMax: 4,
    desc: "Responsible sourcing, packaging practices, and verified ethics commitments.",
    sources: "B-Corp registry · public ethics claims",
  },
];

// ── Governance commitments ──────────────────────────────────────
// Three of the six Vyvata Standards from docs/BRAND-STORY.md,
// surfaced as public-facing copy. Full set lives on /about.
const GOVERNANCE = [
  {
    title: "We score brands whether they submit or not.",
    body: "Missing data scores zero, not neutral. A brand can't opt out of being rated by staying quiet.",
  },
  {
    title: "Verification is free. Always.",
    body: "Brands can submit documentation to earn a higher-confidence Verified score. We will never charge for a better score.",
  },
  {
    title: "Scores are living documents.",
    body: "When evidence changes — a new study, an FDA warning letter, a recall — scores change. Every score on Vyvata is timestamped and auditable.",
  },
];

// ── Core protocols ──────────────────────────────────────────────
const PROTOCOLS = [
  {
    icon: "/icons/Meditate.svg",
    title: "Cognitive Performance",
    tags: ["Focus", "Memory", "Clarity"],
    desc: "Sharpen attention, reduce brain fog, support cognitive output.",
  },
  {
    icon: "/icons/Get Enough Sleep.svg",
    title: "Sleep & Recovery",
    tags: ["Deep Sleep", "Recovery", "HRV"],
    desc: "Restore restorative sleep cycles and physical recovery.",
  },
  {
    icon: "/icons/Supplements.svg",
    title: "Inflammation & Longevity",
    tags: ["Inflammation", "Oxidative Stress", "Lifespan"],
    desc: "Target systemic inflammation and support long-term cellular health.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [stackInput, setStackInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stackInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sr_raw_input", stackInput.trim());
    }
    router.push("/goals");
  };

  const scrollToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus();
  };

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <VyvataLogo size={28} />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            Vyvata
          </span>
        </div>
        <div
          className="hidden md:flex items-center gap-6 text-sm"
          style={{ color: "#C9D6DF" }}
        >
          <Link href="/products" className="hover:text-white transition-colors">
            Scores
          </Link>
          <Link href="/methodology" className="hover:text-white transition-colors">
            Methodology
          </Link>
          <a href="#how" className="hover:text-white transition-colors">
            How it works
          </a>
          <a href="#practitioners" className="hover:text-white transition-colors">
            For Practitioners
          </a>
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <AuthNavLink />
        </div>
        <Link
          href="/products"
          className="hidden md:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all btn-teal"
          style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
        >
          Browse scores
          <ArrowRight size={14} />
        </Link>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg"
          style={{
            color: mobileOpen ? "#14B8A6" : "#C9D6DF",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{
            background: "rgba(11,31,59,0.85)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="absolute top-20 left-4 right-4 rounded-2xl p-2 flex flex-col"
            style={{
              background: "#0E2A50",
              border: "1px solid rgba(201,214,223,0.12)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              fontFamily: "Inter, sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { href: "/products", label: "Scores" },
              { href: "/methodology", label: "Methodology" },
              { href: "#how", label: "How it works" },
              { href: "#practitioners", label: "For Practitioners" },
              { href: "/about", label: "About" },
              { href: "/signin", label: "Sign in" },
              { href: "/me", label: "My protocols" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-3 text-sm rounded-xl transition-colors hover:bg-white/5"
                style={{ color: "#C9D6DF" }}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold btn-teal"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Browse scores
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="hero-bg px-6 py-20 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1.1fr,1fr] gap-12 md:gap-16 items-center">
            {/* Hero copy */}
            <div className="space-y-7 text-center md:text-left">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  borderColor: "rgba(20, 184, 166, 0.3)",
                  background: "rgba(20, 184, 166, 0.08)",
                  color: "#14B8A6",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                INDEPENDENT INTEGRITY SCORES
              </div>

              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white"
                style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.02em" }}
              >
                The integrity score for{" "}
                <span className="text-gradient">what you put in your body.</span>
              </h1>

              <p
                className="text-lg md:text-xl leading-relaxed"
                style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
              >
                Evidence-graded. Compliance-checked. Accountable to you, not the brands being scored.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 items-center md:items-start">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-base btn-teal w-full sm:w-auto"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Browse the scores
                  <ArrowRight size={16} />
                </Link>
                <button
                  onClick={scrollToInput}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    border: "1px solid rgba(201,214,223,0.2)",
                    color: "#C9D6DF",
                    background: "transparent",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Score your own stack
                </button>
              </div>

              <p
                className="text-xs pt-1"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                200+ products scored · Updated daily from federal data sources
              </p>
            </div>

            {/* Hero scorecard visual — static anatomy, no real product */}
            <HeroScorecardVisual />
          </div>

          {/* Scroll hint */}
          <div className="flex justify-center mt-16">
            <button
              onClick={() =>
                document.getElementById("dimensions")?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex flex-col items-center gap-1 opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "#C9D6DF" }}
            >
              <span className="text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                What the score measures
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section
        className="px-6 py-12 border-y"
        style={{ background: "#0E2A50", borderColor: "rgba(20, 184, 166, 0.1)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { stat: "200+", label: "Products Scored", sub: "From NIH DSLD" },
              { stat: "6", label: "Scoring Dimensions", sub: "Weighted 0-100" },
              { stat: "4", label: "Federal Data Sources", sub: "FDA · NIH · NSF · USP" },
              { stat: "Daily", label: "Refresh Cadence", sub: "Scores stay current" },
            ].map((item) => (
              <div key={item.label} className="text-center space-y-1">
                <div
                  className="text-3xl md:text-4xl font-black"
                  style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
                >
                  {item.stat}
                </div>
                <div
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {item.label}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                >
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIMENSIONS (the methodology at a glance) ────────── */}
      <section id="dimensions" className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              WHAT THE SCORE MEASURES
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Six dimensions. One score.
            </h2>
            <p
              className="text-base max-w-2xl mx-auto leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Every product is graded on the same six dimensions, weighted by how much each contributes to real-world product integrity. Weights don't change per product.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {DIMENSIONS.map((d) => {
              const fromPublic = Math.round((d.publicMax / d.weight) * 100);
              const needsSubmission = d.publicMax < d.weight;
              return (
                <div
                  key={d.label}
                  className="glass-card rounded-xl p-6 space-y-4 hover-elevate"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(20, 184, 166, 0.12)",
                        border: "1px solid rgba(20, 184, 166, 0.2)",
                      }}
                    >
                      <d.icon size={18} color="#14B8A6" />
                    </div>
                    <div
                      className="text-right"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      <div
                        className="text-2xl font-black leading-none"
                        style={{ color: "#14B8A6" }}
                      >
                        {d.weight}
                      </div>
                      <div
                        className="text-[10px] uppercase tracking-widest mt-1"
                        style={{ color: "#7A90A8" }}
                      >
                        of 100
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3
                      className="font-bold text-white text-base mb-2"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {d.label}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#C9D6DF" }}
                    >
                      {d.desc}
                    </p>
                  </div>

                  {/* Public vs verification split bar */}
                  <div className="space-y-2">
                    <div
                      className="h-1.5 rounded-full overflow-hidden flex"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        style={{
                          background: "#14B8A6",
                          width: `${fromPublic}%`,
                        }}
                      />
                      {needsSubmission && (
                        <div
                          style={{
                            background: "rgba(20, 184, 166, 0.25)",
                            width: `${100 - fromPublic}%`,
                          }}
                        />
                      )}
                    </div>
                    <div
                      className="text-xs flex items-center justify-between"
                      style={{ fontFamily: "Inter, sans-serif", color: "#7A90A8" }}
                    >
                      <span>
                        {needsSubmission
                          ? `${d.publicMax}/${d.weight} from public data`
                          : `Fully scorable from public data`}
                      </span>
                      {needsSubmission && (
                        <span style={{ color: "#14B8A6" }}>+{d.weight - d.publicMax} with submission</span>
                      )}
                    </div>
                  </div>

                  <p
                    className="text-xs pt-2 border-t"
                    style={{
                      color: "#7A90A8",
                      borderColor: "rgba(201,214,223,0.08)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Sources: {d.sources}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/methodology"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                border: "1px solid rgba(20, 184, 166, 0.4)",
                color: "#14B8A6",
                background: "transparent",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Read the full methodology
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── GOVERNANCE ──────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              HOW WE STAY INDEPENDENT
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Accountable to you, not the brands being scored.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {GOVERNANCE.map((g) => (
              <div
                key={g.title}
                className="rounded-xl p-6 space-y-3"
                style={{
                  background: "rgba(20, 184, 166, 0.04)",
                  border: "1px solid rgba(20, 184, 166, 0.15)",
                }}
              >
                <h3
                  className="font-bold text-white text-base leading-snug"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {g.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                >
                  {g.body}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/about"
              className="text-sm font-semibold transition-colors"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              See all six Vyvata Standards →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how" className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              HOW VYVATA WORKS
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Pull the data. Run the math. Publish the score.
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Ingest public data",
                body: "NIH DSLD for labels. FDA CAERS and warning letters for safety flags. NSF, USP, and Informed Sport for certifications. Refreshed daily.",
              },
              {
                step: "02",
                title: "Match to ingredients",
                body: "Every product ingredient matches a master record with evidence tier, bioavailability, dose range, and interaction data from our clinical library.",
              },
              {
                step: "03",
                title: "Score six dimensions",
                body: "The scoring engine runs deterministic rules per dimension, applies weights, and publishes one integrity score plus a tier.",
              },
              {
                step: "04",
                title: "Re-score when evidence changes",
                body: "A new FDA warning letter, a new study, a recalled batch — scores update automatically, with every change timestamped.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass-card rounded-xl p-6 space-y-3 hover-elevate"
              >
                <div
                  className="text-3xl font-black"
                  style={{
                    color: "rgba(20, 184, 166, 0.3)",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {item.step}
                </div>
                <h3
                  className="font-semibold text-white text-base"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#C9D6DF" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORE YOUR STACK (protocol tool, now second-fold) ── */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              FOR THE SHELF YOU ALREADY OWN
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Score your own stack.
            </h2>
            <p
              className="text-base max-w-xl mx-auto"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Paste what you take. Vyvata parses the ingredients, checks for interactions and gaps, and proposes a revised protocol — with VSF-scored products.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="rounded-xl p-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(201,214,223,0.15)",
              }}
            >
              <Textarea
                ref={inputRef}
                value={stackInput}
                onChange={(e) => setStackInput(e.target.value)}
                placeholder={PLACEHOLDER}
                className="min-h-[160px] bg-transparent border-0 text-white placeholder:text-[#7A90A8] text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl p-4"
                style={{ fontFamily: "Inter, sans-serif" }}
                data-testid="input-stack"
              />
            </div>
            <Button
              type="submit"
              disabled={!stackInput.trim() || isSubmitting}
              className="w-full h-14 text-base font-bold gap-2 rounded-xl transition-all btn-teal"
              style={{ fontFamily: "Montserrat, sans-serif", fontSize: "15px" }}
              data-testid="button-audit"
            >
              {isSubmitting ? "Analyzing your stack..." : "Analyze my stack"}
              {!isSubmitting && <ArrowRight size={16} />}
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(201,214,223,0.12)" }} />
              <span
                className="text-xs"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                or
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(201,214,223,0.12)" }} />
            </div>

            <button
              type="button"
              onClick={() => router.push("/quiz")}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all"
              style={{
                background: "rgba(20,184,166,0.08)",
                border: "1px solid rgba(20,184,166,0.25)",
                color: "#14B8A6",
                fontFamily: "Montserrat, sans-serif",
              }}
              data-testid="button-quiz"
            >
              <Sparkles size={14} />
              Take the guided intake quiz instead
            </button>

            <p
              className="text-center text-xs"
              style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
            >
              Free · No account required · Compliance-first recommendations
            </p>
          </form>
        </div>
      </section>

      {/* ── PROTOCOLS ───────────────────────────────────────── */}
      <section id="protocols" className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              CORE PROTOCOLS
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Evidence-cited protocols for common goals.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PROTOCOLS.map((p) => (
              <div
                key={p.title}
                className="glass-card rounded-xl p-6 space-y-4 hover-elevate cursor-pointer"
                onClick={scrollToInput}
              >
                <div style={{ color: "#14B8A6" }}>
                  <img
                    src={p.icon}
                    alt={p.title}
                    className="w-12 h-12"
                    style={{
                      filter:
                        "brightness(0) saturate(100%) invert(70%) sepia(35%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(90%)",
                    }}
                  />
                </div>
                <div>
                  <h3
                    className="font-bold text-white text-lg mb-2"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#C9D6DF" }}>
                    {p.desc}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(20, 184, 166, 0.1)",
                        color: "#14B8A6",
                        border: "1px solid rgba(20, 184, 166, 0.2)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRACTITIONERS ────────────────────────────────────── */}
      <section
        id="practitioners"
        className="px-6 py-20"
        style={{ background: "#0E2A50" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p
                className="text-xs font-semibold tracking-widest"
                style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
              >
                FOR PRACTITIONERS
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Cite a score.
                <br />
                Not a brand claim.
              </h2>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
              >
                Health coaches, chiropractors, and functional medicine practitioners use Vyvata to justify supplement recommendations with independent scoring — and manage patient protocols in one dashboard.
              </p>
              <ul className="space-y-3">
                {[
                  "Patient dashboard with protocol tracking",
                  "Recommended products carry a live VSF score",
                  "200+ scored products from NIH DSLD, updated daily",
                  "Evidence-cited protocols, compliance-first claims",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm"
                    style={{ color: "#C9D6DF" }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
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
              <a
                href="/practitioner/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
                style={{
                  border: "1px solid rgba(20, 184, 166, 0.4)",
                  color: "#14B8A6",
                  background: "transparent",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Apply for the practitioner program
                <ArrowRight size={14} />
              </a>
            </div>

            {/* Sample protocol visual — unchanged */}
            <div
              className="rounded-2xl p-8 space-y-4"
              style={{
                background: "linear-gradient(135deg, #0E2A50 0%, #0d3d38 100%)",
                border: "1px solid rgba(20, 184, 166, 0.15)",
              }}
            >
              <div
                className="text-xs font-semibold tracking-widest mb-6"
                style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
              >
                SAMPLE PROTOCOL — COGNITIVE PERFORMANCE
              </div>
              {[
                { name: "Creatine Monohydrate", dose: "5g", timing: "AM", status: "ADD", statusColor: "#14B8A6", vsf: "92" },
                { name: "Lion's Mane Extract", dose: "1000mg", timing: "AM", status: "ADD", statusColor: "#14B8A6", vsf: "85" },
                { name: "L-Theanine", dose: "200mg", timing: "AM", status: "KEEP", statusColor: "#34D399", vsf: "88" },
                { name: "Vitamin D3", dose: "5000 IU", timing: "AM", status: "KEEP", statusColor: "#34D399", vsf: "90" },
                { name: "Generic BCAA", dose: "10g", timing: "—", status: "DROP", statusColor: "#F87171", vsf: "42" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2.5 border-b"
                  style={{
                    borderColor: "rgba(201,214,223,0.08)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-10"
                      style={{
                        color: item.statusColor,
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      {item.status}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm text-white">{item.name}</span>
                      <span className="text-xs" style={{ color: "#7A90A8" }}>
                        VSF Score: {item.vsf}/100
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: "#7A90A8" }}
                  >
                    <span>{item.dose}</span>
                    <span>{item.timing}</span>
                  </div>
                </div>
              ))}
              <div
                className="pt-2 flex justify-between text-xs"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                <span>Protocol Score</span>
                <span className="font-bold" style={{ color: "#34D399" }}>
                  78/100 · Good
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section
        className="px-6 py-24 text-center"
        style={{
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d3d38 100%)",
          borderTop: "1px solid rgba(20, 184, 166, 0.1)",
        }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <VyvataLogo size={40} />
          <h2
            className="text-3xl md:text-4xl font-black text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Every product deserves a score.
            <br />
            <span className="text-gradient">Start with yours.</span>
          </h2>
          <p
            className="text-base"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
          >
            Browse 200+ scored products, or paste your stack and get a personalised audit. Free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base btn-teal"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Browse the scores
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={scrollToInput}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition-all"
              style={{
                border: "1px solid rgba(201,214,223,0.2)",
                color: "#C9D6DF",
                background: "transparent",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Score my own stack
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer
        className="px-6 py-8 border-t"
        style={{ borderColor: "rgba(201,214,223,0.08)", background: "#0B1F3B" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <VyvataLogo size={20} />
            <span
              className="font-bold text-sm text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Vyvata
            </span>
          </div>
          <p
            className="text-sm max-w-2xl text-center"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
          >
            The independent integrity score for what you put in your body.
          </p>
          <div
            className="flex items-center justify-center gap-6 text-xs"
            style={{ color: "#7A90A8" }}
          >
            <Link href="/products" className="hover:text-white transition-colors">
              Scores
            </Link>
            <Link href="/methodology" className="hover:text-white transition-colors">
              Methodology
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <a href="#practitioners" className="hover:text-white transition-colors">
              Practitioners
            </a>
          </div>
        </div>
        <div
          className="max-w-5xl mx-auto mt-6 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-2 text-xs"
          style={{
            borderColor: "rgba(201,214,223,0.06)",
            color: "#7A90A8",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <p>
            Structure/function observations only. Not medical advice. Always consult a
            healthcare provider for medical decisions.
          </p>
          <p>© 2026 Vyvata. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero scorecard visual — static anatomy, not a real product.
// Deliberately anonymous: shows the shape of a VSF score without
// staking credibility on any specific product's number being
// current. Swap to a live-queried product when ready.
// ─────────────────────────────────────────────────────────────
function HeroScorecardVisual() {
  // Mirrors the ScoreRing component's visual language
  // (SVG arc + center score + tier badge) but static.
  const score = 87;
  const tier = "VERIFIED";
  const tierColor = "#14B8A6";
  const SIZE = 200;
  const STROKE = 12;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC - (score / 100) * CIRC;

  const bars = [
    { label: "Evidence", value: 92, weight: 25 },
    { label: "Formulation", value: 78, weight: 20 },
    { label: "Manufacturing", value: 88, weight: 20 },
    { label: "Safety", value: 100, weight: 15 },
    { label: "Transparency", value: 83, weight: 12 },
    { label: "Sustainability", value: 60, weight: 8 },
  ];

  return (
    <div
      className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
      style={{
        background: "rgba(17, 32, 64, 0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(20, 184, 166, 0.2)",
        boxShadow: "0 0 48px rgba(20, 184, 166, 0.12)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-widest mb-5"
        style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
      >
        Sample scorecard — anatomy
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              <linearGradient id="hero-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={tierColor} stopOpacity="1" />
                <stop offset="100%" stopColor={tierColor} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="rgba(201,214,223,0.08)"
              strokeWidth={STROKE}
              fill="none"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="url(#hero-ring-grad)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            <span
              className="text-5xl font-black leading-none tabular-nums"
              style={{ color: tierColor }}
            >
              {score}
            </span>
            <span
              className="text-[9px] uppercase tracking-widest mt-1.5"
              style={{ color: "#7A90A8" }}
            >
              / 100
            </span>
            <span
              className="text-[10px] uppercase font-bold tracking-[0.2em] mt-2"
              style={{ color: tierColor }}
            >
              {tier}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 min-w-0">
          {bars.map((b) => (
            <div key={b.label} className="space-y-1">
              <div
                className="flex items-center justify-between text-xs"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <span className="text-white/90 truncate">{b.label}</span>
                <span style={{ color: "#7A90A8" }} className="tabular-nums shrink-0 ml-2">
                  {b.value}/100
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  style={{
                    background: tierColor,
                    width: `${b.value}%`,
                    opacity: 0.4 + (b.weight / 25) * 0.6,
                  }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="pt-4 border-t flex items-center justify-between text-[11px]"
        style={{
          borderColor: "rgba(201,214,223,0.1)",
          fontFamily: "Inter, sans-serif",
          color: "#7A90A8",
        }}
      >
        <span>6 dimensions · weighted 0-100</span>
        <span style={{ color: tierColor }}>✓ Verified mode</span>
      </div>
    </div>
  );
}
