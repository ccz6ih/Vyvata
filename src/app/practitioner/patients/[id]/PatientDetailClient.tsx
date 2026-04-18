"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Moon, Activity, Utensils,
  Brain, Check, Edit3, Trash2, Save, X,
  BarChart3, ShieldCheck, Zap, Clock, Heart,
  Footprints, Hourglass, User,
  type LucideIcon,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditRecord {
  id: string;
  score: number;
  public_slug: string;
  teaser_json: string | null;
  report_json: string | null;
  is_unlocked: boolean;
  email: string | null;
  created_at: string;
}

interface QuizRecord {
  id: string;
  primary_goals: string[];
  age_range: string | null;
  biological_sex: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: string | null;
  diet_type: string | null;
  avg_sleep_hours: number | null;
  sleep_quality: string | null;
  health_conditions: string[];
  medications: string[];
  assigned_protocol_slug: string | null;
  protocol_match_score: number | null;
  raw_responses: Record<string, unknown> | null;
  created_at: string;
}

interface PatientDetail {
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
const PROTOCOL_META: Record<string, { label: string; Icon: LucideIcon; color: string; tagline: string }> = {
  "cognitive-performance": { label: "Cognitive Performance", Icon: Brain,      color: "#818CF8", tagline: "Focus, memory, and mental clarity." },
  "deep-sleep-recovery":   { label: "Deep Sleep & Recovery", Icon: Moon,       color: "#60A5FA", tagline: "Sleep quality and overnight recovery." },
  "athletic-performance":  { label: "Athletic Performance",  Icon: Footprints, color: "#34D399", tagline: "Strength, endurance, and recovery velocity." },
  "longevity-foundation":  { label: "Longevity Foundation",  Icon: Hourglass,  color: "#F59E0B", tagline: "Cellular health and metabolic resilience." },
};

function scoreColor(score: number) {
  if (score >= 70) return "#34D399";
  if (score >= 50) return "#F59E0B";
  return "#F87171";
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,214,223,0.08)" }}>
      <span style={{ color: "#14B8A6" }}>{icon}</span>
      <div>
        <p className="text-xs" style={{ color: "#4a6080" }}>{label}</p>
        <p className="text-sm font-semibold text-white capitalize">{value}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PatientDetailClient({
  linkId,
  practitionerName,
}: {
  linkId: string;
  practitionerName: string;
}) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/practitioner/patients/${linkId}`);
        if (!res.ok) { router.push("/practitioner/dashboard"); return; }
        const data = await res.json();
        setPatient(data.patient);
        setLabelDraft(data.patient.patient_label ?? "");
        setNotesDraft(data.patient.notes ?? "");
      } catch {
        router.push("/practitioner/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [linkId, router]);

  const saveField = async (field: "label" | "notes") => {
    if (!patient) return;
    setSaving(true);
    try {
      await fetch(`/api/practitioner/patients/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "label"
            ? { label: labelDraft }
            : { notes: notesDraft }
        ),
      });
      setPatient((p) =>
        p
          ? { ...p, patient_label: field === "label" ? labelDraft : p.patient_label,
                    notes: field === "notes" ? notesDraft : p.notes }
          : p
      );
      if (field === "label") setEditingLabel(false);
      if (field === "notes") setEditingNotes(false);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Remove this patient from your panel?")) return;
    setArchiving(true);
    await fetch(`/api/practitioner/patients/${linkId}`, { method: "DELETE" });
    router.push("/practitioner/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "#0B1F3B" }}>
        <div className="space-y-3 text-center">
          <VyvataLogo size={28} />
          <p className="text-sm" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>Loading patient...</p>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const audit = patient.audits;
  const quiz = patient.quiz_responses;
  const proto = quiz?.assigned_protocol_slug ? PROTOCOL_META[quiz.assigned_protocol_slug] : null;
  const teaser = audit?.teaser_json ? JSON.parse(audit.teaser_json) : null;
  const displayName = patient.patient_label || `Patient ${patient.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="min-h-dvh pb-16" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{ background: "rgba(11,31,59,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/practitioner/dashboard")}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: "#7A90A8" }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <VyvataLogo size={16} />
            <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
              PRACTITIONER PORTAL
            </span>
          </div>
        </div>
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: "#7A90A8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          data-testid="button-archive"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* ── Patient header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{
                background: proto ? `${proto.color}18` : "rgba(20,184,166,0.12)",
                border: `1px solid ${proto?.color ?? "#14B8A6"}30`,
              }}
            >
              {proto ? <proto.Icon size={22} strokeWidth={1.75} /> : <User size={22} strokeWidth={1.75} />}
            </div>

            <div className="space-y-1">
              {/* Editable label */}
              {editingLabel ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="text-lg font-black bg-transparent outline-none border-b text-white"
                    style={{ fontFamily: "Montserrat, sans-serif", borderColor: "#14B8A6" }}
                    onKeyDown={(e) => { if (e.key === "Enter") saveField("label"); if (e.key === "Escape") setEditingLabel(false); }}
                    data-testid="input-patient-label"
                  />
                  <button onClick={() => saveField("label")} disabled={saving} style={{ color: "#14B8A6" }}>
                    <Save size={14} />
                  </button>
                  <button onClick={() => setEditingLabel(false)} style={{ color: "#7A90A8" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                    {displayName}
                  </h1>
                  <button onClick={() => setEditingLabel(true)} className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: "#C9D6DF" }}>
                    <Edit3 size={13} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {proto && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: proto.color }}>
                    <proto.Icon size={12} strokeWidth={1.75} />
                    {proto.label}
                  </span>
                )}
                {quiz?.age_range && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "#7A90A8" }}>
                    Age {quiz.age_range}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score badge */}
          {audit && (
            <div className="text-center shrink-0">
              <div
                className="text-3xl font-black"
                style={{ color: scoreColor(audit.score), fontFamily: "Montserrat, sans-serif", textShadow: `0 0 20px ${scoreColor(audit.score)}40` }}
              >
                {audit.score}
              </div>
              <div className="text-xs" style={{ color: "#4a6080" }}>stack score</div>
            </div>
          )}
        </div>

        {/* ── Protocol match ── */}
        {proto && (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: `${proto.color}12`, border: `1px solid ${proto.color}30` }}
          >
            <div style={{ color: proto.color }}>
              <proto.Icon size={26} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: proto.color }}>
                Matched Protocol · {quiz?.protocol_match_score ?? "—"}% fit
              </p>
              <p className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>{proto.label}</p>
              <p className="text-xs" style={{ color: "#7A90A8" }}>{proto.tagline}</p>
            </div>
            {audit && (
              <a
                href={`/protocol/${audit.public_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg shrink-0"
                style={{ background: `${proto.color}15`, color: proto.color, border: `1px solid ${proto.color}25` }}
                data-testid="link-protocol"
              >
                View <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {/* ── Health signals ── */}
        {quiz && (
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
              Health Intake Signals
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {quiz.avg_sleep_hours && (
                <InfoChip icon={<Moon size={13} />} label="Avg sleep" value={`${quiz.avg_sleep_hours}h / night`} />
              )}
              {quiz.sleep_quality && (
                <InfoChip icon={<Moon size={13} />} label="Sleep quality"
                  value={["","terrible","poor","fair","good","excellent"][parseInt(quiz.sleep_quality)] ?? quiz.sleep_quality} />
              )}
              {quiz.activity_level && (
                <InfoChip icon={<Activity size={13} />} label="Activity" value={quiz.activity_level.replace(/_/g, " ")} />
              )}
              {quiz.diet_type && (
                <InfoChip icon={<Utensils size={13} />} label="Diet" value={quiz.diet_type} />
              )}
            </div>

            {/* Goals */}
            {quiz.primary_goals.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={{ color: "#4a6080" }}>Goals</p>
                <div className="flex flex-wrap gap-2">
                  {quiz.primary_goals.map((g) => (
                    <span key={g} className="text-xs px-2.5 py-1 rounded-full capitalize"
                      style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)" }}>
                      {g.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Health conditions */}
            {quiz.health_conditions?.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={{ color: "#4a6080" }}>Flagged conditions</p>
                <div className="flex flex-wrap gap-2">
                  {quiz.health_conditions.map((c) => (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-full capitalize"
                      style={{ background: "rgba(248,113,113,0.08)", color: "#FCA5A5", border: "1px solid rgba(248,113,113,0.15)" }}>
                      {c.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Audit teaser findings ── */}
        {teaser?.headlineFindings?.length > 0 && (
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
              Stack Audit Findings
            </p>
            {teaser.headlineFindings.map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: "#14B8A6" }}>0{i + 1}</span>
                <p className="text-sm text-white leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>{f}</p>
              </div>
            ))}
            {audit && (
              <a
                href={`/protocol/${audit.public_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium mt-1"
                style={{ color: "#14B8A6" }}
              >
                View full protocol report <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {/* ── Practitioner notes ── */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
              Practitioner Notes
            </p>
            {!editingNotes && (
              <button
                onClick={() => { setEditingNotes(true); setTimeout(() => notesRef.current?.focus(), 50); }}
                className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
                style={{ color: "#14B8A6" }}
              >
                <Edit3 size={11} /> Edit
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                ref={notesRef}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={5}
                placeholder="Clinical observations, follow-up items, dosing adjustments..."
                className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(20,184,166,0.35)",
                  color: "#E8F0F5",
                  lineHeight: 1.6,
                }}
                data-testid="textarea-notes"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveField("notes")}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #14B8A6, #0F766E)", color: "#fff", fontFamily: "Montserrat, sans-serif" }}
                  data-testid="button-save-notes"
                >
                  <Save size={13} /> {saving ? "Saving..." : "Save Notes"}
                </button>
                <button
                  onClick={() => { setEditingNotes(false); setNotesDraft(patient.notes ?? ""); }}
                  className="text-sm px-3 py-2 rounded-xl"
                  style={{ color: "#7A90A8", background: "rgba(255,255,255,0.04)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {patient.notes ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#C9D6DF" }}>
                  {patient.notes}
                </p>
              ) : (
                <p className="text-sm italic" style={{ color: "#4a6080" }}>
                  No notes yet. Click Edit to add clinical observations.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Raw quiz data (collapsed) ── */}
        {quiz?.raw_responses && Object.keys(quiz.raw_responses).length > 0 && (
          <details className="group">
            <summary
              className="cursor-pointer text-xs font-semibold uppercase tracking-widest px-4 py-3 rounded-xl list-none flex items-center justify-between"
              style={{ background: "rgba(17,32,64,0.4)", color: "#7A90A8", border: "1px solid rgba(201,214,223,0.06)" }}
            >
              <span>Raw Quiz Responses</span>
              <span className="transition-transform group-open:rotate-180">↓</span>
            </summary>
            <div
              className="mt-2 rounded-xl p-4 space-y-2"
              style={{ background: "rgba(17,32,64,0.3)", border: "1px solid rgba(201,214,223,0.05)" }}
            >
              {Object.entries(quiz.raw_responses).map(([key, val]) => (
                val !== undefined && val !== null ? (
                  <div key={key} className="flex items-start gap-3 text-xs">
                    <span className="shrink-0 w-36 capitalize" style={{ color: "#4a6080" }}>
                      {key.replace(/_/g, " ")}
                    </span>
                    <span style={{ color: "#C9D6DF" }}>
                      {Array.isArray(val) ? (val as string[]).join(", ") : String(val)}
                    </span>
                  </div>
                ) : null
              ))}
            </div>
          </details>
        )}

      </div>
    </div>
  );
}
