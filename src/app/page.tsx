"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap, BarChart3, Users, ChevronDown, Brain, Moon, Flame, Menu, X, Package, Award, Database } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import AuthNavLink from "@/components/AuthNavLink";

const PLACEHOLDER = `Energy crashes mid-afternoon
Poor sleep, waking at 3am
Brain fog, can't focus after lunch
Joint inflammation, stress from work
Already taking: Vitamin D3 5000IU, Magnesium, Fish Oil...

Paste your symptoms, goals, or current stack — however you have it.`;

const PROTOCOLS = [
  {
    icon: "/icons/Meditate.svg",
    title: "Cognitive Performance",
    tags: ["Focus", "Memory", "Clarity"],
    desc: "Sharpen attention, reduce brain fog, optimize cognitive output.",
  },
  {
    icon: "/icons/Get Enough Sleep.svg",
    title: "Sleep & Recovery",
    tags: ["Deep Sleep", "Recovery", "HRV"],
    desc: "Restore restorative sleep cycles and accelerate physical recovery.",
  },
  {
    icon: "/icons/Supplements.svg",
    title: "Inflammation & Longevity",
    tags: ["Inflammation", "Oxidative Stress", "Lifespan"],
    desc: "Target systemic inflammation and support long-term cellular health.",
  },
];

const TRUST_SIGNALS = [
  { icon: Shield, label: "Compliance-first", sub: "Structure/function only. No disease claims." },
  { icon: Database, label: "NIH-Sourced Products", sub: "69+ products from DSLD with daily data refresh." },
  { icon: Award, label: "VSF Integrity Scoring", sub: "Bioavailability + transparency + certifications rated 0-100." },
  { icon: Users, label: "Practitioner Dashboard", sub: "Patient management with product recommendations built in." },
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
        <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "#C9D6DF" }}>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#products" className="hover:text-white transition-colors">Products</a>
          <a href="#protocols" className="hover:text-white transition-colors">Protocols</a>
          <a href="#practitioners" className="hover:text-white transition-colors">For Practitioners</a>
          <a href="/about" className="hover:text-white transition-colors">About</a>
          <AuthNavLink />
        </div>
        <button
          onClick={scrollToInput}
          className="hidden md:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          style={{
            background: "#14B8A6",
            color: "#FFFFFF",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          Get My Protocol
          <ArrowRight size={14} />
        </button>

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
          style={{ background: "rgba(11,31,59,0.85)", backdropFilter: "blur(8px)" }}
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
              { href: "#how",           label: "How it works" },
              { href: "#products",      label: "Products" },
              { href: "#protocols",     label: "Protocols" },
              { href: "#practitioners", label: "For Practitioners" },
              { href: "/about",         label: "About" },
              { href: "/signin",        label: "Sign in" },
              { href: "/me",            label: "My protocols" },
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
            <button
              onClick={() => { setMobileOpen(false); scrollToInput(); }}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{
                background: "#14B8A6",
                color: "#FFFFFF",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Get My Protocol
              <ArrowRight size={14} />
            </button>
          </nav>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="hero-bg px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border"
            style={{
              borderColor: "rgba(20, 184, 166, 0.3)",
              background: "rgba(20, 184, 166, 0.08)",
              color: "#14B8A6",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            <Sparkles size={11} />
            AI-POWERED WELLNESS INTELLIGENCE
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1
              className="text-4xl md:text-6xl font-black leading-tight text-white"
              style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.02em" }}
            >
              The integrity score for
              <br />
              <span className="text-gradient">what you put in your body.</span>
            </h1>
            <p
              className="text-lg max-w-xl mx-auto leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Evidence-graded. Compliance-checked. Accountable to you — not the brands being scored. 
              Build your personalized supplement protocol with <strong style={{ color: "#14B8A6" }}>real products from our curated database</strong> in 60 seconds.
            </p>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4 text-left">
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
              {isSubmitting ? "Building your protocol..." : "Analyze & Build My Protocol"}
              {!isSubmitting && <ArrowRight size={16} />}
            </Button>

            {/* Divider with quiz CTA */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(201,214,223,0.12)" }} />
              <span className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>or</span>
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

          {/* Scroll hint */}
          <button
            onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            className="mx-auto flex flex-col items-center gap-1 opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: "#C9D6DF" }}
          >
            <span className="text-xs" style={{ fontFamily: "Inter, sans-serif" }}>See how it works</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section className="px-6 py-12 border-y" style={{ background: "#0E2A50", borderColor: "rgba(20, 184, 166, 0.1)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { stat: "69+", label: "Curated Products", sub: "From NIH DSLD" },
              { stat: "300+", label: "Ingredients Analyzed", sub: "Evidence-graded" },
              { stat: "100%", label: "Compliance-First", sub: "Structure/function only" },
              { stat: "Daily", label: "Data Refresh", sub: "Always current" },
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
                <div className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how" className="px-6 py-20" style={{ background: "#0E2A50" }}>
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
              Intelligence that works for you
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: "#C9D6DF" }}>
              Not a quiz. Not a generic recommendation. A real analysis engine built on
              clinical evidence and your specific goals.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Describe yourself",
                body: "Share your symptoms, goals, and current supplements — as messy as you like. Vyvata parses it all.",
              },
              {
                step: "02",
                title: "Set your goals",
                body: "Energy, sleep, focus, inflammation, longevity, performance — pick what matters most.",
              },
              {
                step: "03",
                title: "Intelligence runs",
                body: "Our AI engine cross-references 300+ ingredients from DSLD, checks interactions, scores bioavailability, and grades evidence tiers.",
              },
              {
                step: "04",
                title: "Real product matches",
                body: "Get specific product recommendations with VSF scores, certifications, and bioavailability ratings — not just ingredient lists.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass-card rounded-xl p-6 space-y-3 hover-elevate"
              >
                <div
                  className="text-3xl font-black"
                  style={{ color: "rgba(20, 184, 166, 0.3)", fontFamily: "Montserrat, sans-serif" }}
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

      {/* ── PRODUCT INTELLIGENCE ────────────────────────────── */}
      <section id="products" className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              PRODUCT INTELLIGENCE
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Real products. Real scores. Real science.
            </h2>
            <p className="text-base max-w-2xl mx-auto" style={{ color: "#C9D6DF" }}>
              We don't just recommend ingredients — we recommend specific products with transparency you can trust.
              All products sourced from the NIH ODS DSLD database with daily data refresh.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Database,
                title: "NIH-Sourced Database",
                stat: "69+ Products",
                body: "Curated from the DSLD (Dietary Supplement Label Database) maintained by the National Institutes of Health. Daily cache refresh keeps data current.",
              },
              {
                icon: Award,
                title: "VSF Integrity Scoring",
                stat: "0-100 Scale",
                body: "Every product scored on bioavailability (70%), transparency (20%), and certifications (10%). Diamond/Gold/Silver tiers for instant quality assessment.",
              },
              {
                icon: Package,
                title: "Bioavailability Rated",
                stat: "High/Med/Low",
                body: "Magnesium bisglycinate scores HIGH. Magnesium oxide scores LOW. We auto-detect forms and rate absorption potential for every ingredient.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass-card rounded-xl p-6 space-y-4 hover-elevate"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(20, 184, 166, 0.12)", border: "1px solid rgba(20, 184, 166, 0.2)" }}
                  >
                    <item.icon size={20} color="#14B8A6" />
                  </div>
                  <div
                    className="text-2xl font-black"
                    style={{ color: "rgba(20, 184, 166, 0.4)", fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.stat}
                  </div>
                </div>
                <h3
                  className="font-bold text-white text-base"
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

          <div className="mt-10 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs border"
              style={{
                borderColor: "rgba(20, 184, 166, 0.2)",
                background: "rgba(20, 184, 166, 0.05)",
                color: "#14B8A6",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Database size={12} />
              Data Source: NIH Office of Dietary Supplements DSLD · Updated Daily
            </div>
          </div>
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
              Built for how you actually live
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
                  <img src={p.icon} alt={p.title} className="w-12 h-12" style={{ filter: "brightness(0) saturate(100%) invert(70%) sepia(35%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(90%)" }} />
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

          <div className="text-center mt-10">
            <button
              onClick={scrollToInput}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm btn-teal"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Get My Personalized Protocol
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ───────────────────────────────────── */}
      <section className="px-6 py-16" style={{ background: "#0E2A50" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {TRUST_SIGNALS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(20, 184, 166, 0.12)", border: "1px solid rgba(20, 184, 166, 0.2)" }}
                >
                  <Icon size={18} color="#14B8A6" />
                </div>
                <div>
                  <div
                    className="font-semibold text-white text-sm"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: "#7A90A8" }}
                  >
                    {sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRACTITIONERS ────────────────────────────────────── */}
      <section id="practitioners" className="px-6 py-20" style={{ background: "#0B1F3B" }}>
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
                Complete practitioner platform
                <br />
                for supplement protocols
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#C9D6DF" }}>
                Health coaches, chiropractors, and functional medicine practitioners use Vyvata
                to deliver personalized supplement protocols at scale — with patient management and product recommendations built right in.
              </p>
              <ul className="space-y-3">
                {[
                  "Patient dashboard with protocol tracking",
                  "Product recommendations with VSF scores",
                  "69+ curated products from NIH DSLD",
                  "Evidence-based, compliance-first protocols",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "#C9D6DF" }}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(20, 184, 166, 0.15)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="#14B8A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

            {/* Visual */}
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
                  style={{ borderColor: "rgba(201,214,223,0.08)", fontFamily: "Inter, sans-serif" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-10"
                      style={{ color: item.statusColor, fontFamily: "Montserrat, sans-serif" }}
                    >
                      {item.status}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm text-white">{item.name}</span>
                      <span className="text-xs" style={{ color: "#7A90A8" }}>VSF Score: {item.vsf}/100</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#7A90A8" }}>
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
                <span className="font-bold" style={{ color: "#34D399" }}>78/100 · Good</span>
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
            Stop guessing.
            <br />
            <span className="text-gradient">Start optimizing.</span>
          </h2>
          <p className="text-base" style={{ color: "#C9D6DF" }}>
            Your personalized protocol in under 60 seconds. Free.
          </p>
          <button
            onClick={scrollToInput}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-base btn-teal"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Build My Protocol
            <ArrowRight size={16} />
          </button>
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
          </div>          <p className="text-sm max-w-2xl mx-auto" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
            The independent integrity score for what you put in your body.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs" style={{ color: "#7A90A8" }}>
            <a href="/about" className="hover:text-white transition-colors">About</a>
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <a href="#practitioners" className="hover:text-white transition-colors">For Practitioners</a>
          </div>          <p className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            Structure/function observations only. Not medical advice. Always consult a healthcare provider for medical decisions.
          </p>
          <p className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            © 2026 Vyvata. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
