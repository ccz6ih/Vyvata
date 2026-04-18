"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Share2, Lock, CheckCircle, XCircle,
  AlertTriangle, Plus, ArrowRight, RefreshCw, Sparkles
} from "lucide-react";
import type { AuditResult, ReportSection, WorkingItem, WastingItem, FightingItem, MissingItem, RevisedStackItem } from "@/types";

// ── SHARED COMPONENTS ─────────────────────────────────────────

function VyvataLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="#14B8A6" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.5" />
      <path d="M9 9L16 23L23 9" stroke="#14B8A6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.8" fill="#14B8A6" />
      <circle cx="9" cy="9" r="1.5" fill="#14B8A6" opacity="0.7" />
      <circle cx="23" cy="9" r="1.5" fill="#14B8A6" opacity="0.7" />
    </svg>
  );
}

function EvidencePip({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    strong:   "#34D399",
    moderate: "#F59E0B",
    weak:     "#FB923C",
    none:     "#F87171",
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: colors[tier] || "#7A90A8" }}
      title={`Evidence: ${tier}`}
    />
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#34D399" : score >= 50 ? "#F59E0B" : "#F87171";
  const label = score >= 70 ? "Optimized" : score >= 50 ? "Needs Work" : "Underperforming";
  return (
    <div className="text-center space-y-2">
      <div
        className="text-7xl font-black"
        style={{
          color,
          fontFamily: "Montserrat, sans-serif",
          textShadow: `0 0 40px ${color}40`,
        }}
      >
        {score}
      </div>
      <div className="space-y-0.5">
        <div
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color, fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </div>
        <div
          className="text-xs"
          style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
        >
          Protocol Score / 100
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  label,
  count,
  iconColor,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: "rgba(17,32,64,0.6)",
        border: "1px solid rgba(201,214,223,0.10)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor || "#14B8A6" }}>{icon}</span>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
          >
            {label}
          </span>
        </div>
        {count !== undefined && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(201,214,223,0.06)",
              color: "#7A90A8",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── FULL REPORT ───────────────────────────────────────────────

function FullReport({ report }: { report: ReportSection }) {
  return (
    <div className="space-y-5">
      {/* Verdict */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(17,32,64,0.8) 0%, rgba(13,61,56,0.4) 100%)",
          border: "1px solid rgba(20,184,166,0.15)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
        >
          THE VERDICT
        </p>
        <p
          className="text-base leading-relaxed font-medium text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {report.verdict}
        </p>
      </div>

      {/* What's Working */}
      {report.working.length > 0 && (
        <SectionCard
          icon={<CheckCircle size={15} />}
          label="What's Working"
          count={report.working.length}
          iconColor="#34D399"
        >
          <div className="space-y-3">
            {report.working.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3"
                style={{
                  borderBottom: i < report.working.length - 1 ? "1px solid rgba(201,214,223,0.06)" : "none",
                }}
              >
                <EvidencePip tier={item.evidenceTier} />
                <div>
                  <div
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.name}
                  </div>
                  <div
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                  >
                    {item.reason}
                  </div>
                </div>
                <span
                  className="ml-auto text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    color: "#34D399",
                    border: "1px solid rgba(52,211,153,0.2)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {item.evidenceTier}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* What's Wasting */}
      {report.wasting.length > 0 && (
        <SectionCard
          icon={<XCircle size={15} />}
          label="Wasting Your Money"
          count={report.wasting.length}
          iconColor="#F87171"
        >
          <div className="space-y-4">
            {report.wasting.map((item, i) => (
              <div
                key={i}
                className="space-y-2 pb-4"
                style={{
                  borderBottom: i < report.wasting.length - 1 ? "1px solid rgba(201,214,223,0.06)" : "none",
                }}
              >
                <div className="flex items-center gap-2">
                  <EvidencePip tier={item.evidenceTier} />
                  <span
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(248,113,113,0.1)",
                      color: "#F87171",
                      border: "1px solid rgba(248,113,113,0.2)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {item.evidenceTier === "none" ? "No evidence" : "Weak evidence"}
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                >
                  {item.reason}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
                >
                  → {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Interactions */}
      {report.fighting.length > 0 && (
        <SectionCard
          icon={<AlertTriangle size={15} />}
          label="What's Fighting Itself"
          count={report.fighting.length}
          iconColor="#F59E0B"
        >
          <div className="space-y-5">
            {report.fighting.map((item, i) => (
              <div
                key={i}
                className="space-y-3 pb-4"
                style={{
                  borderBottom: i < report.fighting.length - 1 ? "1px solid rgba(201,214,223,0.06)" : "none",
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {item.ingredients.map((ing) => (
                    <span
                      key={ing}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        color: "#F59E0B",
                        border: "1px solid rgba(245,158,11,0.2)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
                <p
                  className="text-sm leading-relaxed text-white"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {item.interaction}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
                >
                  → {item.fix}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Missing */}
      {report.missing.length > 0 && (
        <SectionCard
          icon={<Plus size={15} />}
          label="What You're Missing"
          count={report.missing.length}
          iconColor="#14B8A6"
        >
          <div className="space-y-3">
            {report.missing.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3"
                style={{
                  borderBottom: i < report.missing.length - 1 ? "1px solid rgba(201,214,223,0.06)" : "none",
                }}
              >
                <EvidencePip tier={item.evidenceTier} />
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.name}
                  </div>
                  <div
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                  >
                    {item.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Revised Stack */}
      {report.revisedStack.length > 0 && (
        <SectionCard
          icon={<RefreshCw size={15} />}
          label="Your Optimized Protocol"
          iconColor="#14B8A6"
        >
          <div className="space-y-0">
            {report.revisedStack.map((item, i) => {
              const statusConfig: Record<string, { color: string; label: string }> = {
                keep:   { color: "#34D399", label: "KEEP" },
                remove: { color: "#F87171", label: "DROP" },
                modify: { color: "#F59E0B", label: "MODIFY" },
                add:    { color: "#14B8A6", label: "ADD" },
              };
              const s = statusConfig[item.status] || statusConfig.keep;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < report.revisedStack.length - 1 ? "1px solid rgba(201,214,223,0.06)" : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-12"
                      style={{ color: s.color, fontFamily: "Montserrat, sans-serif" }}
                    >
                      {s.label}
                    </span>
                    <div>
                      <span
                        className="text-sm text-white"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {item.name}
                      </span>
                      {item.note && (
                        <span
                          className="text-xs ml-2"
                          style={{ color: "#7A90A8" }}
                        >
                          · {item.note}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                  >
                    {item.dose && <span>{item.dose}</span>}
                    {item.timing && (
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(201,214,223,0.06)" }}
                      >
                        {item.timing}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="pt-3 flex justify-between text-xs border-t"
            style={{
              borderColor: "rgba(201,214,223,0.08)",
              color: "#7A90A8",
              fontFamily: "Inter, sans-serif",
              borderStyle: "dashed",
            }}
          >
            <span>Total recommended</span>
            <span className="font-semibold" style={{ color: "#34D399" }}>
              {report.revisedStack.filter((i) => i.status !== "remove").length} supplements
            </span>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ── MAIN CLIENT COMPONENT ─────────────────────────────────────

// ── Quiz-based protocol map (matches /api/quiz route) ────────────
const PROTOCOL_META: Record<string, { name: string; icon: string; category: string; tagline: string }> = {
  "cognitive-performance": {
    name: "Cognitive Performance",
    icon: "🧠",
    category: "Focus & Cognition",
    tagline: "Sharpen attention, reduce brain fog, optimize mental output.",
  },
  "deep-sleep-recovery": {
    name: "Deep Sleep & Recovery",
    icon: "🌙",
    category: "Sleep & Recovery",
    tagline: "Restore restorative sleep cycles and accelerate physical recovery.",
  },
  "athletic-performance": {
    name: "Athletic Performance",
    icon: "🏃",
    category: "Performance",
    tagline: "Maximize output, endurance, and recovery velocity.",
  },
  "longevity-foundation": {
    name: "Longevity Foundation",
    icon: "🕰️",
    category: "Longevity",
    tagline: "Target cellular health, inflammation, and metabolic resilience.",
  },
};

export default function ProtocolClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const fromQuiz = searchParams.get("from") === "quiz";

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, unknown> | null>(null);

  // Read quiz answers from sessionStorage if coming from quiz flow
  useEffect(() => {
    if (fromQuiz && typeof window !== "undefined") {
      const stored = sessionStorage.getItem("vv_quiz_answers");
      if (stored) {
        try { setQuizAnswers(JSON.parse(stored)); } catch {}
      }
    }
  }, [fromQuiz]);

  useEffect(() => {
    const fetchAudit = async () => {
      if (isNew && typeof window !== "undefined") {
        const cached = sessionStorage.getItem("sr_audit_result");
        if (cached) {
          const data = JSON.parse(cached);
          setAuditId(data.auditId);
          setAudit({
            sessionId: data.sessionId,
            publicSlug: slug,
            score: data.score,
            teaser: data.teaser,
            isUnlocked: false,
          });
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(`/api/audit/${slug}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setAudit({
          sessionId: "",
          publicSlug: data.publicSlug,
          score: data.score,
          teaser: data.teaser,
          report: data.report,
          isUnlocked: data.isUnlocked,
          email: data.email,
        });
        setAuditId(data.id);
        if (data.isUnlocked) setUnlocked(true);
      } catch {
        // error state handled below
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, [slug, isNew]);

  const handleUnlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !auditId || unlocking) return;
    setUnlocking(true);

    try {
      const sessionId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("sr_session_id") || ""
          : "";

      const res = await fetch("/api/unlock-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, email, sessionId }),
      });

      if (!res.ok) throw new Error("Failed to unlock");
      const data = await res.json();

      setAudit((prev) =>
        prev ? { ...prev, report: data.report, isUnlocked: true } : null
      );
      setUnlocked(true);
      toast.success("Protocol unlocked. Check your inbox for your copy.");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href.replace("/protocol/", "/protocol/");
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Vyvata Protocol — Score: ${audit?.score}/100`,
          text: `I built my personalized wellness protocol with Vyvata. Score: ${audit?.score}/100.`,
          url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "#0B1F3B" }}
      >
        <div
          className="text-sm"
          style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
        >
          Loading protocol...
        </div>
      </main>
    );
  }

  // Quiz-only path: no stack was entered, show protocol template without audit score
  if (!audit && fromQuiz && PROTOCOL_META[slug]) {
    const meta = PROTOCOL_META[slug];
    return (
      <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
        <header
          className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
          style={{ background: "rgba(11,31,59,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <a href="/" className="p-1.5 rounded-lg" style={{ color: "#7A90A8" }}>
              <ArrowLeft size={18} />
            </a>
            <div className="flex items-center gap-2">
              <VyvataLogo size={20} />
              <span className="font-bold text-sm text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>Vyvata</span>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)", fontFamily: "Inter, sans-serif" }}>
            AI Matched
          </span>
        </header>

        <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
          {/* Protocol hero */}
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "linear-gradient(135deg, rgba(17,32,64,0.9) 0%, rgba(13,61,56,0.5) 100%)", border: "1px solid rgba(20,184,166,0.25)" }}
          >
            <div className="text-4xl mb-4">{meta.icon}</div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
              Your Recommended Protocol
            </p>
            <h1 className="text-2xl font-black text-white mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {meta.name}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
              {meta.tagline}
            </p>
          </div>

          {/* Quiz signals */}
          {quizAnswers && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(17,32,64,0.5)", border: "1px solid rgba(201,214,223,0.08)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>Based on your intake</p>
              <div className="flex flex-wrap gap-2">
                {(quizAnswers.primary_goal as string | undefined) && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)" }}>
                    {String(quizAnswers.primary_goal).replace(/_/g, " ")}
                  </span>
                )}
                {(quizAnswers.secondary_goals as string[] | undefined)?.map((g: string) => (
                  <span key={g} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "#7A90A8", border: "1px solid rgba(201,214,223,0.1)" }}>
                    {g.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt to audit stack */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.12)" }}
          >
            <div>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Get your full personalized analysis
              </h3>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
                Tell us what supplements you're currently taking and we'll audit your stack against this protocol — showing exactly what to keep, remove, add, and adjust.
              </p>
            </div>
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #14B8A6, #0F766E)", color: "#fff", fontFamily: "Montserrat, sans-serif", boxShadow: "0 0 24px rgba(20,184,166,0.25)" }}
            >
              <Sparkles size={14} />
              Audit my current stack
            </a>
            <p className="text-center text-xs" style={{ color: "#4a6080", fontFamily: "Inter, sans-serif" }}>
              Free · 2 minutes · Evidence-graded results
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!audit) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center px-6"
        style={{ background: "#0B1F3B" }}
      >
        <div className="text-center space-y-4">
          <p className="text-sm" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
            Protocol not found.
          </p>
          <a href="/" className="text-sm underline" style={{ color: "#14B8A6" }}>
            Build a new protocol
          </a>
        </div>
      </main>
    );
  }

  const { teaser, report } = audit;

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#7A90A8" }}
          >
            <ArrowLeft size={18} />
          </a>
          <div className="flex items-center gap-2">
            <VyvataLogo size={20} />
            <span
              className="font-bold text-sm text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Vyvata
            </span>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            border: "1px solid rgba(201,214,223,0.15)",
            color: "#C9D6DF",
            background: "transparent",
            fontFamily: "Inter, sans-serif",
          }}
          data-testid="button-share"
        >
          <Share2 size={12} />
          Share Protocol
        </button>
      </header>

      <div className="max-w-xl mx-auto px-6 py-10 space-y-6">

        {/* Quiz-derived protocol banner */}
        {fromQuiz && (PROTOCOL_META[slug] || quizAnswers) && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.1) 0%, rgba(15,118,110,0.07) 100%)",
              border: "1px solid rgba(20,184,166,0.25)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.2)" }}
              >
                {PROTOCOL_META[slug]?.icon || "✨"}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}>
                  Matched by Vyvata AI
                </p>
                <p className="text-base font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  {PROTOCOL_META[slug]?.name || "Your Protocol"}
                </p>
                {PROTOCOL_META[slug]?.tagline && (
                  <p className="text-sm leading-relaxed" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
                    {PROTOCOL_META[slug].tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Quiz signals used */}
            {quizAnswers && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(quizAnswers.primary_goal as string | undefined) && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)" }}>
                    Goal: {String(quizAnswers.primary_goal).replace(/_/g, " ")}
                  </span>
                )}
                {(quizAnswers.sleep_quality as string | undefined) && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(20,184,166,0.06)", color: "#7A90A8", border: "1px solid rgba(201,214,223,0.08)" }}>
                    Sleep: {["terrible","poor","fair","good","excellent"][parseInt(quizAnswers.sleep_quality as string) - 1] || (quizAnswers.sleep_quality as string)}
                  </span>
                )}
                {(quizAnswers.energy_level as string | undefined) && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(20,184,166,0.06)", color: "#7A90A8", border: "1px solid rgba(201,214,223,0.08)" }}>
                    Energy: {["exhausted","low","moderate","good","high"][parseInt(quizAnswers.energy_level as string) - 1] || (quizAnswers.energy_level as string)}
                  </span>
                )}
                {(quizAnswers.activity_level as string | undefined) && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(20,184,166,0.06)", color: "#7A90A8", border: "1px solid rgba(201,214,223,0.08)" }}>
                    Activity: {String(quizAnswers.activity_level).replace(/_/g, " ")}
                  </span>
                )}
              </div>
            )}

            {/* CTA to also audit a stack */}
            <div className="pt-1 flex items-center gap-2">
              <a
                href="/"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(20,184,166,0.08)",
                  border: "1px solid rgba(20,184,166,0.2)",
                  color: "#14B8A6",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <RefreshCw size={11} />
                Audit my current stack too
              </a>
              <span className="text-xs" style={{ color: "#4a6080" }}>to get a full interaction analysis</span>
            </div>
          </div>
        )}

        {/* Score card */}
        <div
          className="rounded-2xl p-8 text-center teal-glow"
          style={{
            background: "linear-gradient(135deg, rgba(17,32,64,0.8) 0%, rgba(13,61,56,0.3) 100%)",
            border: "1px solid rgba(20,184,166,0.2)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
          >
            YOUR VYVATA PROTOCOL · #{slug.toUpperCase()}
          </p>
          <ScoreRing score={audit.score} />
        </div>

        {/* Teaser findings */}
        <div className="space-y-3">
          {teaser.headlineFindings.map((finding, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl px-4 py-3.5"
              style={{
                background: "rgba(17,32,64,0.5)",
                border: "1px solid rgba(201,214,223,0.08)",
              }}
            >
              <span
                className="text-xs font-bold shrink-0 mt-0.5 w-5"
                style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
              >
                0{i + 1}
              </span>
              <p
                className="text-sm leading-relaxed text-white"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {finding}
              </p>
            </div>
          ))}
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3.5"
            style={{
              background: "rgba(20,184,166,0.08)",
              border: "1px solid rgba(20,184,166,0.2)",
            }}
          >
            <Sparkles size={14} className="shrink-0 mt-0.5" style={{ color: "#14B8A6" }} />
            <p
              className="text-sm font-medium"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              {teaser.teaserHook}
            </p>
          </div>
        </div>

        {/* Gate or full report */}
        {!unlocked && !audit.isUnlocked ? (
          <div className="space-y-5">
            {/* Blurred preview */}
            <div className="relative rounded-xl overflow-hidden">
              <div
                className="blur-gate p-5 space-y-3 rounded-xl"
                style={{
                  background: "rgba(17,32,64,0.6)",
                  border: "1px solid rgba(201,214,223,0.08)",
                }}
              >
                <div className="h-4 rounded w-24" style={{ background: "rgba(201,214,223,0.1)" }} />
                <div className="h-3 rounded w-full" style={{ background: "rgba(201,214,223,0.06)" }} />
                <div className="h-3 rounded w-4/5" style={{ background: "rgba(201,214,223,0.06)" }} />
                <div className="h-3 rounded w-3/4" style={{ background: "rgba(201,214,223,0.06)" }} />
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 rounded" style={{ background: "rgba(201,214,223,0.04)" }} />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(11,31,59,0.9)", border: "1px solid rgba(20,184,166,0.3)" }}
                >
                  <Lock size={16} style={{ color: "#14B8A6" }} />
                </div>
                <p
                  className="text-xs font-medium"
                  style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                >
                  Full protocol locked
                </p>
              </div>
            </div>

            {/* Email gate */}
            <div
              className="rounded-2xl p-6 space-y-5"
              style={{
                background: "rgba(17,32,64,0.6)",
                border: "1px solid rgba(201,214,223,0.12)",
              }}
            >
              <div>
                <h3
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Unlock your full protocol
                </h3>
                <p
                  className="text-sm mt-1.5 leading-relaxed"
                  style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
                >
                  Get the complete breakdown — verdict, what's working, what to drop,
                  interactions to fix, what you're missing, and your optimized stack.
                </p>
              </div>
              <form onSubmit={handleUnlock} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-[#7A90A8] focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(201,214,223,0.15)",
                    fontFamily: "Inter, sans-serif",
                  }}
                  data-testid="input-email"
                />
                <Button
                  type="submit"
                  disabled={!email || unlocking}
                  className="w-full h-13 font-bold gap-2 rounded-xl btn-teal"
                  style={{
                    height: "52px",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                  }}
                  data-testid="button-unlock"
                >
                  {unlocking ? "Unlocking..." : "Unlock Full Protocol"}
                  {!unlocking && <ArrowRight size={15} />}
                </Button>
                <p
                  className="text-center text-xs"
                  style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                >
                  Free forever. We'll also send your protocol to your inbox. No spam.
                </p>
              </form>
            </div>
          </div>
        ) : report ? (
          <FullReport report={report} />
        ) : (
          <div
            className="text-center py-8 text-sm"
            style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
          >
            Loading full protocol...
          </div>
        )}

        {/* Share section (post-unlock) */}
        {(unlocked || audit.isUnlocked) && (
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "rgba(17,32,64,0.4)",
              border: "1px solid rgba(201,214,223,0.08)",
            }}
          >
            <h3
              className="font-semibold text-sm text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Share your protocol
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Challenge someone to compare their stack. Your score is already attached.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg transition-all"
                style={{
                  border: "1px solid rgba(201,214,223,0.15)",
                  color: "#C9D6DF",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Share2 size={14} />
                Share
              </button>
              <a
                href="/"
                className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg transition-all"
                style={{
                  border: "1px solid rgba(20,184,166,0.25)",
                  color: "#14B8A6",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <RefreshCw size={14} />
                Re-audit
              </a>
            </div>
          </div>
        )}

        {/* Legal */}
        <p
          className="text-center text-xs leading-relaxed pb-6"
          style={{ color: "#4A6080", fontFamily: "Inter, sans-serif" }}
        >
          Vyvata makes structure/function observations only. Not medical advice.
          For health conditions, consult a qualified healthcare provider.
        </p>
      </div>
    </main>
  );
}
