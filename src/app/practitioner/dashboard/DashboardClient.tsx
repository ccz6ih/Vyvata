"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, BarChart3, Brain, Moon, Zap, Clock,
  LogOut, Plus, ChevronRight, Search, X,
  Stethoscope, TrendingUp, Activity
} from "lucide-react";
import type { PractitionerSession } from "@/lib/practitioner-auth";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditRecord {
  id: string;
  score: number;
  public_slug: string;
  is_unlocked: boolean;
  email: string | null;
  created_at: string;
}

interface QuizRecord {
  id: string;
  primary_goals: string[];
  age_range: string | null;
  activity_level: string | null;
  diet_type: string | null;
  avg_sleep_hours: number | null;
  sleep_quality: string | null;
  assigned_protocol_slug: string | null;
  protocol_match_score: number | null;
  created_at: string;
}

interface PatientLink {
  id: string;
  session_id: string;
  patient_label: string | null;
  notes: string | null;
  status: string;
  added_at: string;
  audits: AuditRecord | null;
  quiz_responses: QuizRecord | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function VyvataLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Vyvata">
      <circle cx="16" cy="16" r="14.5" stroke="#14B8A6" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.5" />
      <path d="M9 9L16 23L23 9" stroke="#14B8A6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.8" fill="#14B8A6" />
      <circle cx="9" cy="9" r="1.5" fill="#14B8A6" opacity="0.7" />
      <circle cx="23" cy="9" r="1.5" fill="#14B8A6" opacity="0.7" />
    </svg>
  );
}

const PROTOCOL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  "cognitive-performance": { label: "Cognitive",  icon: "🧠", color: "#818CF8" },
  "deep-sleep-recovery":   { label: "Sleep",      icon: "🌙", color: "#60A5FA" },
  "athletic-performance":  { label: "Performance",icon: "🏃", color: "#34D399" },
  "longevity-foundation":  { label: "Longevity",  icon: "🕰️", color: "#F59E0B" },
};

function scoreColor(score: number) {
  if (score >= 70) return "#34D399";
  if (score >= 50) return "#F59E0B";
  return "#F87171";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Add Patient Modal ─────────────────────────────────────────────────────────
function AddPatientModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/practitioner/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSlug: slug.trim(), label: label.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: "#0E2A50", border: "1px solid rgba(201,214,223,0.12)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Add Patient
          </h3>
          <button onClick={onClose} style={{ color: "#7A90A8" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#7A90A8" }}>
              Protocol Slug or Share Link
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. abc123xyz or full URL"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#E8F0F5",
                fontFamily: "Inter, sans-serif",
              }}
              data-testid="input-slug"
            />
            <p className="text-xs" style={{ color: "#4a6080" }}>
              The unique ID from the patient's protocol URL: /protocol/<strong>slug</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#7A90A8" }}>
              Patient Label <span style={{ color: "#4a6080" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. John D., Client #42"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#E8F0F5",
                fontFamily: "Inter, sans-serif",
              }}
              data-testid="input-label"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!slug.trim() || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: slug && !loading ? "linear-gradient(135deg, #14B8A6, #0F766E)" : "rgba(255,255,255,0.06)",
              color: slug && !loading ? "#fff" : "#4a6080",
              fontFamily: "Montserrat, sans-serif",
            }}
            data-testid="button-add-patient"
          >
            {loading ? "Adding..." : "Add to Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Patient Card ──────────────────────────────────────────────────────────────
function PatientCard({ patient, onClick }: { patient: PatientLink; onClick: () => void }) {
  const audit = patient.audits;
  const quiz = patient.quiz_responses;
  const protocolSlug = quiz?.assigned_protocol_slug ?? null;
  const proto = protocolSlug ? PROTOCOL_LABELS[protocolSlug] : null;
  const goals = quiz?.primary_goals ?? [];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] group"
      style={{
        background: "rgba(17,32,64,0.6)",
        border: "1px solid rgba(201,214,223,0.08)",
      }}
      data-testid={`card-patient-${patient.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: name + meta */}
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatar circle */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
            style={{
              background: proto ? `${proto.color}18` : "rgba(20,184,166,0.12)",
              border: `1px solid ${proto?.color ?? "#14B8A6"}30`,
              color: proto?.color ?? "#14B8A6",
            }}
          >
            {proto?.icon ?? "👤"}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {patient.patient_label || `Patient ${patient.id.slice(0, 6).toUpperCase()}`}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {proto && (
                <span className="text-xs" style={{ color: proto.color }}>
                  {proto.label}
                </span>
              )}
              {goals.slice(0, 2).map((g) => (
                <span key={g} className="text-xs px-1.5 py-0.5 rounded-md capitalize"
                  style={{ background: "rgba(255,255,255,0.04)", color: "#7A90A8" }}>
                  {g.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: score + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          {audit && (
            <div className="text-right">
              <div className="text-lg font-black" style={{ color: scoreColor(audit.score), fontFamily: "Montserrat, sans-serif" }}>
                {audit.score}
              </div>
              <div className="text-xs" style={{ color: "#4a6080" }}>score</div>
            </div>
          )}
          <ChevronRight size={15} className="opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: "#C9D6DF" }} />
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-3 mt-3 pt-3"
        style={{ borderTop: "1px solid rgba(201,214,223,0.06)" }}>
        {quiz?.avg_sleep_hours && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "#7A90A8" }}>
            <Moon size={10} /> {quiz.avg_sleep_hours}h sleep
          </span>
        )}
        {quiz?.activity_level && (
          <span className="flex items-center gap-1 text-xs capitalize" style={{ color: "#7A90A8" }}>
            <Activity size={10} /> {quiz.activity_level.replace(/_/g, " ")}
          </span>
        )}
        <span className="ml-auto text-xs" style={{ color: "#4a6080" }}>
          {timeAgo(patient.added_at)}
        </span>
      </div>
    </button>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function PractitionerDashboardClient({
  practitioner,
}: {
  practitioner: PractitionerSession;
}) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/practitioner/patients");
      if (!res.ok) return;
      const data = await res.json();
      setPatients(data.patients ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/practitioner/auth", { method: "DELETE" });
    router.push("/practitioner/login");
  };

  // Computed stats
  const avgScore = patients.length
    ? Math.round(patients.reduce((s, p) => s + (p.audits?.score ?? 0), 0) / patients.filter(p => p.audits).length || 0)
    : 0;

  const protocolCounts = patients.reduce<Record<string, number>>((acc, p) => {
    const slug = p.quiz_responses?.assigned_protocol_slug;
    if (slug) acc[slug] = (acc[slug] ?? 0) + 1;
    return acc;
  }, {});

  const topProtocol = Object.entries(protocolCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Filter
  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.patient_label ?? "").toLowerCase().includes(q) ||
      (p.quiz_responses?.assigned_protocol_slug ?? "").includes(q) ||
      (p.quiz_responses?.primary_goals ?? []).some((g) => g.includes(q))
    );
  });

  return (
    <div className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)" }}
          >
            <Stethoscope size={14} style={{ color: "#14B8A6" }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <VyvataLogo size={14} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                VYVATA
              </span>
            </div>
            <p className="text-xs" style={{ color: "#7A90A8" }}>Practitioner Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {practitioner.name}
              {practitioner.credential && (
                <span className="ml-1 font-normal text-xs" style={{ color: "#14B8A6" }}>, {practitioner.credential}</span>
              )}
            </p>
            <p className="text-xs" style={{ color: "#7A90A8" }}>{practitioner.tier} plan</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: "#7A90A8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid="button-logout"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">

        {/* ── Welcome + stats ── */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Good evening, {practitioner.name.split(" ")[1] ?? practitioner.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#7A90A8" }}>
              {practitioner.specialty ?? "Your practitioner dashboard"}
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: Users,
                label: "Patients",
                value: patients.length.toString(),
                sub: "in panel",
                color: "#14B8A6",
              },
              {
                icon: BarChart3,
                label: "Avg Score",
                value: patients.filter(p => p.audits).length > 0 ? `${avgScore}` : "—",
                sub: "/ 100",
                color: avgScore >= 70 ? "#34D399" : avgScore >= 50 ? "#F59E0B" : "#F87171",
              },
              {
                icon: TrendingUp,
                label: "Top Protocol",
                value: topProtocol ? PROTOCOL_LABELS[topProtocol]?.icon ?? "—" : "—",
                sub: topProtocol ? PROTOCOL_LABELS[topProtocol]?.label ?? topProtocol : "none yet",
                color: topProtocol ? PROTOCOL_LABELS[topProtocol]?.color ?? "#14B8A6" : "#4a6080",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 space-y-1"
                style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
              >
                <stat.icon size={14} style={{ color: stat.color }} />
                <div className="text-2xl font-black" style={{ color: stat.color, fontFamily: "Montserrat, sans-serif" }}>
                  {stat.value}
                </div>
                <div className="text-xs" style={{ color: "#4a6080" }}>{stat.sub}</div>
                <div className="text-xs font-medium" style={{ color: "#7A90A8" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Protocol distribution ── */}
        {Object.keys(protocolCounts).length > 0 && (
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
              Protocol Distribution
            </p>
            <div className="space-y-2.5">
              {Object.entries(protocolCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([slug, count]) => {
                  const proto = PROTOCOL_LABELS[slug];
                  const pct = Math.round((count / patients.length) * 100);
                  return (
                    <div key={slug} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5" style={{ color: "#C9D6DF" }}>
                          <span>{proto?.icon}</span>
                          <span>{proto?.label ?? slug}</span>
                        </span>
                        <span style={{ color: proto?.color ?? "#14B8A6" }}>{count} ({pct}%)</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "rgba(201,214,223,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: proto?.color ?? "#14B8A6" }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Patient list ── */}
        <div className="space-y-4">
          {/* List header */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Patient Panel
            </h2>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl transition-all"
              style={{
                background: "linear-gradient(135deg, #14B8A6, #0F766E)",
                color: "#fff",
                fontFamily: "Montserrat, sans-serif",
                boxShadow: "0 0 16px rgba(20,184,166,0.2)",
              }}
              data-testid="button-add"
            >
              <Plus size={14} />
              Add Patient
            </button>
          </div>

          {/* Search */}
          {patients.length > 3 && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#7A90A8" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, protocol, goal..."
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#E8F0F5",
                }}
                data-testid="input-search"
              />
            </div>
          )}

          {/* Patient cards */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-xl animate-pulse"
                  style={{ background: "rgba(17,32,64,0.4)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center space-y-3"
              style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
            >
              <div className="text-3xl">🩺</div>
              <p className="text-sm font-semibold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {search ? "No patients match your search" : "No patients yet"}
              </p>
              <p className="text-xs" style={{ color: "#7A90A8" }}>
                {search
                  ? "Try a different search term."
                  : "Add a patient using their protocol slug from the Vyvata report URL."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-2 text-sm font-medium underline"
                  style={{ color: "#14B8A6" }}
                >
                  Add your first patient
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  onClick={() => router.push(`/practitioner/patients/${p.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Quick protocol reference ── */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: "rgba(17,32,64,0.4)", border: "1px solid rgba(201,214,223,0.06)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
            Protocol Reference
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PROTOCOL_LABELS).map(([slug, meta]) => (
              <div key={slug} className="flex items-center gap-2 text-xs">
                <span>{meta.icon}</span>
                <span style={{ color: meta.color }}>{meta.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#4a6080" }}>
            Full protocol evidence summaries coming in v2.
          </p>
        </div>

      </div>

      {/* Modal */}
      {showAdd && (
        <AddPatientModal
          onClose={() => setShowAdd(false)}
          onAdded={fetchPatients}
        />
      )}
    </div>
  );
}
