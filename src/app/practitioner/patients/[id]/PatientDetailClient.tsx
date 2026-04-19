"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Moon, Activity, Utensils,
  Brain, Check, Edit3, Trash2, Save, X,
  BarChart3, ShieldCheck, Zap, Clock, Heart,
  Footprints, Hourglass, User, Pause, Archive,
  ChevronDown, AlertCircle, Download, Package, Award,
  type LucideIcon,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import type { PatientNote, PatientStatus } from "@/types";

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
  status: PatientStatus;
  added_at: string;
  audits: AuditRecord | null;
  quiz_responses: QuizRecord | null;
}

interface ProductIngredient {
  ingredient_name: string;
  dose: string;
  unit: string;
  form: string;
  bioavailability: string;
}

interface ProductScore {
  integrity: number;
  formulation: number;
  transparency: number;
  certification: number;
  tier: string;
}

interface RecommendedProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  price_usd: number;
  ingredients: ProductIngredient[];
  score: ProductScore | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PROTOCOL_META: Record<string, { label: string; Icon: LucideIcon; color: string; tagline: string }> = {
  "cognitive-performance": { label: "Cognitive Performance", Icon: Brain,      color: "#818CF8", tagline: "Focus, memory, and mental clarity." },
  "deep-sleep-recovery":   { label: "Deep Sleep & Recovery", Icon: Moon,       color: "#60A5FA", tagline: "Sleep quality and overnight recovery." },
  "athletic-performance":  { label: "Athletic Performance",  Icon: Footprints, color: "#34D399", tagline: "Strength, endurance, and recovery velocity." },
  "longevity-foundation":  { label: "Longevity Foundation",  Icon: Hourglass,  color: "#F59E0B", tagline: "Cellular health and metabolic resilience." },
};

const STATUS_CONFIG: Record<PatientStatus, { label: string; Icon: LucideIcon; color: string }> = {
  active: { label: "Active", Icon: Activity, color: "#34D399" },
  paused: { label: "Paused", Icon: Pause, color: "#F59E0B" },
  archived: { label: "Archived", Icon: Archive, color: "#7A90A8" },
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

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
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
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Fetch patient details
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/practitioner/patients/${linkId}`);
        if (!res.ok) { router.push("/practitioner/dashboard"); return; }
        const data = await res.json();
        setPatient(data.patient);
        setLabelDraft(data.patient.patient_label ?? "");
      } catch {
        router.push("/practitioner/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [linkId, router]);

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/practitioner/patients/${linkId}/notes`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      } finally {
        setNotesLoading(false);
      }
    };
    if (linkId) fetchNotes();
  }, [linkId]);

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    if (statusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusMenuOpen]);
  // Fetch product recommendations based on patient's protocol/goals
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!patient?.quiz_responses?.assigned_protocol_slug) return;
      
      setProductsLoading(true);
      try {
        // Map protocol slugs to relevant categories
        const categoryMap: Record<string, string> = {
          "deep-sleep-recovery": "magnesium",
          "cognitive-performance": "omega-3",
          "athletic-performance": "omega-3",
          "longevity-foundation": "vitamin-d",
        };
        
        const category = categoryMap[patient.quiz_responses.assigned_protocol_slug];
        if (!category) return;
        
        const params = new URLSearchParams({
          category,
          limit: "3",
          minScore: "60",
        });
        
        const res = await fetch(`/api/practitioner/products/recommendations?${params}`);
        if (res.ok) {
          const data = await res.json();
          setRecommendedProducts(data.recommendations || []);
        }
      } catch (err) {
        console.error("Failed to fetch product recommendations:", err);
      } finally {
        setProductsLoading(false);
      }
    };
    
    if (patient) fetchRecommendations();
  }, [patient]);
  const saveLabel = async () => {
    if (!patient) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/practitioner/patients/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: labelDraft }),
      });
      if (!res.ok) throw new Error("Failed to save label");
      setPatient((p) => p ? { ...p, patient_label: labelDraft } : p);
      setEditingLabel(false);
    } catch (err) {
      setError("Failed to save label. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (newStatus: PatientStatus) => {
    if (!patient) return;
    
    // Confirmation for irreversible transitions
    if (newStatus === "archived" && !confirm("Archive this patient? This action cannot be undone.")) {
      setStatusMenuOpen(false);
      return;
    }
    
    setChangingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/practitioner/patients/${linkId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to change status");
      setPatient((p) => p ? { ...p, status: newStatus } : p);
      setStatusMenuOpen(false);
    } catch (err) {
      setError("Failed to change status. Please try again.");
    } finally {
      setChangingStatus(false);
    }
  };

  const addNote = async () => {
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    setError(null);
    try {
      const res = await fetch(`/api/practitioner/patients/${linkId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNoteText }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      const data = await res.json();
      setNotes((prev) => [data.note, ...prev]);
      setNewNoteText("");
    } catch (err) {
      setError("Failed to add note. Please try again.");
    } finally {
      setAddingNote(false);
    }
  };

  const updateNote = async (noteId: string) => {
    if (!editNoteDraft.trim()) return;
    setSavingNoteId(noteId);
    setError(null);
    try {
      const res = await fetch(`/api/practitioner/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: editNoteDraft }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? data.note : n)));
      setEditingNoteId(null);
      setEditNoteDraft("");
    } catch (err) {
      setError("Failed to update note. Please try again.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    setDeletingNoteId(noteId);
    setError(null);
    try {
      const res = await fetch(`/api/practitioner/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError("Failed to delete note. Please try again.");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const exportPDF = () => {
    // Open PDF export endpoint in new tab to trigger download
    window.open(`/api/practitioner/patients/${linkId}/export-pdf`, "_blank");
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
  const statusInfo = STATUS_CONFIG[patient.status];

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
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ 
              color: "#14B8A6", 
              background: "rgba(20,184,166,0.08)", 
              border: "1px solid rgba(20,184,166,0.25)",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 600,
            }}
            data-testid="button-export-pdf"
            title="Export protocol report as PDF"
          >
            <Download size={12} />
            Export PDF
          </button>
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
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Error message */}
        {error && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
          >
            <AlertCircle size={18} style={{ color: "#F87171", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#FCA5A5" }}>Error</p>
              <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto" style={{ color: "#7A90A8" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Patient header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
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

            <div className="space-y-2 flex-1">
              {/* Editable label */}
              {editingLabel ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="text-lg font-black bg-transparent outline-none border-b text-white"
                    style={{ fontFamily: "Montserrat, sans-serif", borderColor: "#14B8A6" }}
                    onKeyDown={(e) => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") setEditingLabel(false); }}
                    data-testid="input-patient-label"
                  />
                  <button onClick={saveLabel} disabled={saving} style={{ color: "#14B8A6" }}>
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
                {/* Status badge with dropdown */}
                <div className="relative" ref={statusMenuRef}>
                  <button
                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: `${statusInfo.color}20`, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}
                    data-testid="button-status"
                  >
                    <statusInfo.Icon size={11} strokeWidth={2} />
                    {statusInfo.label}
                    <ChevronDown size={10} className={`transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  {statusMenuOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden z-10 shadow-xl"
                      style={{ background: "rgba(17,32,64,0.98)", border: "1px solid rgba(201,214,223,0.12)", minWidth: 140 }}
                    >
                      {(["active", "paused", "archived"] as PatientStatus[]).map((status) => {
                        const config = STATUS_CONFIG[status];
                        const isCurrent = patient.status === status;
                        return (
                          <button
                            key={status}
                            onClick={() => changeStatus(status)}
                            disabled={isCurrent || changingStatus}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-all"
                            style={{
                              background: isCurrent ? `${config.color}15` : "transparent",
                              color: isCurrent ? config.color : "#C9D6DF",
                              opacity: isCurrent ? 0.6 : 1,
                              cursor: isCurrent ? "default" : "pointer",
                            }}
                            data-testid={`status-option-${status}`}
                          >
                            <config.Icon size={12} strokeWidth={1.75} />
                            {config.label}
                            {isCurrent && <Check size={11} className="ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

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

        {/* ── Product recommendations ── */}
        {patient?.quiz_responses?.assigned_protocol_slug && (
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} color="#14B8A6" />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
                  Recommended Products
                </p>
              </div>
              <a
                href="/practitioner/products"
                className="text-xs font-medium"
                style={{ color: "#14B8A6" }}
              >
                View all →
              </a>
            </div>

            {productsLoading ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "#4a6080" }}>Loading recommendations...</p>
              </div>
            ) : recommendedProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} color="#7A90A8" className="mx-auto mb-2 opacity-50" />
                <p className="text-sm" style={{ color: "#4a6080" }}>
                  No products found for this protocol
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {recommendedProducts.map((product) => {
                  const tierColors: Record<string, string> = {
                    diamond: "#14B8A6",
                    gold: "#F59E0B",
                    silver: "#94A3B8",
                  };
                  const tierColor = product.score ? tierColors[product.score.tier] || "#7A90A8" : "#7A90A8";
                  
                  return (
                    <div
                      key={product.id}
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,214,223,0.06)" }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className="text-sm font-bold text-white"
                              style={{ fontFamily: "Montserrat, sans-serif" }}
                            >
                              {product.brand}
                            </h4>
                            {product.score && (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-bold"
                                style={{
                                  background: `${tierColor}15`,
                                  border: `1px solid ${tierColor}30`,
                                  color: tierColor,
                                  fontFamily: "Montserrat, sans-serif",
                                }}
                              >
                                <Award size={10} className="inline mr-1" />
                                {product.score.tier.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: "#C9D6DF" }}>
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: "#7A90A8" }}>
                            <span className="px-2 py-0.5 rounded" style={{ background: "rgba(20,184,166,0.08)", color: "#14B8A6" }}>
                              {product.category}
                            </span>
                            {product.price_usd > 0 && (
                              <>
                                <span>•</span>
                                <span>${product.price_usd.toFixed(2)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* VSF Score */}
                      {product.score && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: "#7A90A8" }}>VSF Score</span>
                            <span
                              className="font-bold"
                              style={{
                                color: scoreColor(product.score.integrity),
                                fontFamily: "Montserrat, sans-serif",
                              }}
                            >
                              {product.score.integrity}/100
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: "rgba(201,214,223,0.08)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${product.score.integrity}%`,
                                background: scoreColor(product.score.integrity),
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Key ingredients preview */}
                      {product.ingredients.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold" style={{ color: "#7A90A8" }}>
                            Key Ingredients ({product.ingredients.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {product.ingredients.slice(0, 3).map((ing, idx) => {
                              const bioColors: Record<string, string> = {
                                high: "#34D399",
                                medium: "#F59E0B",
                                low: "#F87171",
                              };
                              const bioColor = bioColors[ing.bioavailability.toLowerCase()] || "#7A90A8";
                              
                              return (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded text-xs"
                                  style={{
                                    background: `${bioColor}10`,
                                    color: bioColor,
                                    fontFamily: "Inter, sans-serif",
                                  }}
                                >
                                  {ing.ingredient_name} • {ing.dose}{ing.unit}
                                </span>
                              );
                            })}
                            {product.ingredients.length > 3 && (
                              <span className="px-2 py-1 text-xs" style={{ color: "#7A90A8" }}>
                                +{product.ingredients.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action */}
                      <button
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{
                          background: "#14B8A6",
                          color: "#FFFFFF",
                          fontFamily: "Montserrat, sans-serif",
                        }}
                      >
                        Email to Patient
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Practitioner notes ── */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <img src="/icons/Keep a Journal.svg" alt="" className="w-5 h-5 opacity-80" style={{ filter: "invert(62%) sepia(11%) saturate(1135%) hue-rotate(153deg) brightness(95%) contrast(89%)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest flex-1" style={{ color: "#7A90A8" }}>
              Patient Notes Timeline
            </p>
          </div>

          {/* Add note form */}
          <div className="space-y-2">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3}
              placeholder="Add clinical observation, follow-up item, or dosing adjustment..."
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(201,214,223,0.12)",
                color: "#E8F0F5",
                lineHeight: 1.6,
              }}
              data-testid="textarea-new-note"
            />
            <button
              onClick={addNote}
              disabled={addingNote || !newNoteText.trim()}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #14B8A6, #0F766E)", color: "#fff", fontFamily: "Montserrat, sans-serif" }}
              data-testid="button-add-note"
            >
              <Save size={13} /> {addingNote ? "Adding..." : "Add Note"}
            </button>
          </div>

          {/* Notes timeline */}
          {notesLoading ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "#4a6080" }}>Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm italic" style={{ color: "#4a6080" }}>No notes yet. Add your first clinical observation above.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {notes.map((note) => {
                const isEditing = editingNoteId === note.id;
                const isDeleting = deletingNoteId === note.id;
                const isSaving = savingNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,214,223,0.06)" }}
                    data-testid={`note-${note.id}`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          value={editNoteDraft}
                          onChange={(e) => setEditNoteDraft(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(20,184,166,0.35)",
                            color: "#E8F0F5",
                            lineHeight: 1.6,
                          }}
                          data-testid={`textarea-edit-note-${note.id}`}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateNote(note.id)}
                            disabled={isSaving || !editNoteDraft.trim()}
                            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                            style={{ background: "#14B8A6", color: "#fff" }}
                            data-testid={`button-save-edit-${note.id}`}
                          >
                            <Save size={11} /> {isSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => { setEditingNoteId(null); setEditNoteDraft(""); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg"
                            style={{ color: "#7A90A8", background: "rgba(255,255,255,0.04)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1" style={{ color: "#C9D6DF" }}>
                            {note.note}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingNoteId(note.id); setEditNoteDraft(note.note); }}
                              className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                              style={{ color: "#7A90A8" }}
                              data-testid={`button-edit-note-${note.id}`}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                              style={{ color: "#F87171" }}
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#4a6080" }}>
                          <Clock size={10} />
                          <span>{timeAgo(note.created_at)}</span>
                          {note.updated_at !== note.created_at && (
                            <span className="opacity-60">(edited {timeAgo(note.updated_at)})</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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
