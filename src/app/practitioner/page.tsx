import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Users, BarChart3, BookOpen, ShieldCheck,
  Clipboard, Stethoscope, Sparkles, CheckCircle2,
} from "lucide-react";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { VyvataLogo } from "@/components/VyvataLogo";

const PILLARS = [
  {
    Icon: Users,
    title: "Patient panel",
    body: "One place to see every patient you're supporting — their goals, stack, score, and status. Notes, label-per-patient, archive.",
  },
  {
    Icon: BarChart3,
    title: "Cohort analytics",
    body: "Goal distribution, protocol match rates, trending ingredients, evidence tiers — at the panel level, not per patient.",
  },
  {
    Icon: BookOpen,
    title: "Evidence library",
    body: "Clinical summaries for every ingredient, interaction, and protocol — with citations. Reference at the point of care.",
  },
  {
    Icon: ShieldCheck,
    title: "Compliance-first",
    body: "Structure/function language only. No disease claims. Every report passes the FDA-style filter before it reaches the patient.",
  },
];

const FLOW = [
  {
    step: "01",
    title: "Your patient runs Vyvata",
    body: "They paste their stack (or take the guided quiz) on vyvata.com. Takes 60 seconds.",
  },
  {
    step: "02",
    title: "They share the protocol slug",
    body: "You get a one-click link from your patient. They don't need an account.",
  },
  {
    step: "03",
    title: "You review and annotate",
    body: "Add the patient to your panel. Review the audit, add your notes, flag interactions, adjust the plan.",
  },
];

const FAQ = [
  {
    q: "Who is this for?",
    a: "Functional medicine practitioners, chiropractors, naturopaths, registered dietitians, health coaches, and concierge / longevity clinicians who manage supplement protocols for clients.",
  },
  {
    q: "Do my patients need an account?",
    a: "No. They get a protocol URL after running Vyvata. You add that slug to your panel with one click. Optional: patients can save to their own account for history.",
  },
  {
    q: "What does it cost?",
    a: "The practitioner Pro plan is currently application-only during the early-access period. Apply below; we'll reach out to confirm fit and send an access code.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Vyvata generates structure/function observations only, not medical advice. Every recommendation is reviewable by you before it reaches a patient.",
  },
];

export default async function PractitionerLandingPage() {
  const session = await getPractitionerSession();
  if (session) redirect("/practitioner/dashboard");

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <VyvataLogo size={28} />
          <span className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}>
            Vyvata
          </span>
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
            for Practitioners
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/practitioner/login"
            className="text-sm"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
            Sign in
          </Link>
          <Link href="/practitioner/register"
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: "#14B8A6", color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
            Apply <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="hero-bg px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border"
            style={{
              borderColor: "rgba(20, 184, 166, 0.3)",
              background: "rgba(20, 184, 166, 0.08)",
              color: "#14B8A6",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.05em",
            }}>
            <Stethoscope size={11} />
            PRACTITIONER PROGRAM · EARLY ACCESS
          </div>

          <h1 className="text-4xl md:text-6xl font-black leading-tight text-white"
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.02em" }}>
            The intelligence layer
            <br />
            <span className="text-gradient">for your practice.</span>
          </h1>

          <p className="text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
            Vyvata turns your clients' supplement stacks into evidence-graded protocols in 60 seconds.
            You get the patient panel, the cohort data, and the compliance filter — they get a better plan.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/practitioner/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm btn-teal"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              Apply for early access
              <ArrowRight size={15} />
            </Link>
            <Link href="/practitioner/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm"
              style={{
                background: "rgba(20,184,166,0.08)",
                border: "1px solid rgba(20,184,166,0.25)",
                color: "#14B8A6",
                fontFamily: "Montserrat, sans-serif",
              }}>
              Already approved? Sign in
            </Link>
          </div>

          <p className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            Demo account: <span className="font-mono">demo@vyvata.com</span> · <span className="font-mono">DEMO-2026</span>
          </p>
        </div>
      </section>

      {/* ── PILLARS ─────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
              WHAT YOU GET
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              Built for the way you work
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {PILLARS.map(({ Icon, title, body }) => (
              <div key={title}
                className="rounded-xl p-6 space-y-3"
                style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6" }}>
                  <Icon size={18} strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-white text-base"
                  style={{ fontFamily: "Montserrat, sans-serif" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#C9D6DF" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
              HOW IT WORKS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              From patient stack to patient plan
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FLOW.map((item) => (
              <div key={item.step}
                className="rounded-xl p-6 space-y-3"
                style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}>
                <div className="text-3xl font-black"
                  style={{ color: "rgba(20, 184, 166, 0.3)", fontFamily: "Montserrat, sans-serif" }}>
                  {item.step}
                </div>
                <h3 className="font-semibold text-white text-base"
                  style={{ fontFamily: "Montserrat, sans-serif" }}>
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

      {/* ── INCLUDED ────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ background: "#0E2A50" }}>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
              WHAT'S INCLUDED
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              Everything in one place
            </h2>
          </div>

          <div className="rounded-2xl p-7 space-y-3"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}>
            {[
              "Unlimited patient audits + protocols",
              "Cohort analytics (goals, protocols, interactions, evidence tiers)",
              "Evidence library with clinical summaries + citations",
              "Patient notes and status transitions",
              "PDF protocol export for patient handoff",
              "CSV panel export",
              "Compliance-first LLM synthesis — no disease claims",
              "7-day session cookie auth",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm"
                style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
                <CheckCircle2 size={16} style={{ color: "#14B8A6" }} className="shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ background: "#0B1F3B" }}>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
              QUESTIONS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              A few things worth knowing
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div key={q}
                className="rounded-xl p-5 space-y-2"
                style={{ background: "rgba(17,32,64,0.4)", border: "1px solid rgba(201,214,223,0.08)" }}>
                <h3 className="font-semibold text-white text-sm"
                  style={{ fontFamily: "Montserrat, sans-serif" }}>
                  {q}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#C9D6DF" }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="px-6 py-24 text-center"
        style={{
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d3d38 100%)",
          borderTop: "1px solid rgba(20, 184, 166, 0.1)",
        }}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Clipboard size={28} style={{ color: "#14B8A6" }} className="mx-auto" />
          <h2 className="text-3xl md:text-4xl font-black text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}>
            Ready to try Vyvata with your panel?
          </h2>
          <p className="text-base" style={{ color: "#C9D6DF" }}>
            Application takes ~5 minutes. We'll review within 2 business days and send your access code by email.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/practitioner/register"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-base btn-teal"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              Apply now
              <ArrowRight size={16} />
            </Link>
            <Link href="/practitioner/login"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm"
              style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
              Already a practitioner? Sign in <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="px-6 py-8 border-t"
        style={{ borderColor: "rgba(201,214,223,0.08)", background: "#0B1F3B" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <VyvataLogo size={20} />
            <span className="font-bold text-sm text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}>
              Vyvata
            </span>
          </Link>
          <p className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            <Sparkles size={10} className="inline mr-1" style={{ color: "#14B8A6" }} />
            Structure/function observations only. Not medical advice.
          </p>
          <p className="text-xs" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            © 2026 Vyvata. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
