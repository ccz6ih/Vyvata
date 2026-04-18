"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  RefreshCw, Users, ClipboardList, ShieldCheck, AlertTriangle,
  ExternalLink, Mail, Building2, Stethoscope, Globe, User,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Practitioner {
  id: string;
  name: string;
  email: string;
  credential: string;
  license_number: string | null;
  specialty: string;
  organization: string | null;
  practice_type: string;
  practice_website: string | null;
  patient_volume: string;
  use_case: string;
  verification_status: "pending" | "approved" | "rejected";
  is_verified: boolean;
  is_active: boolean;
  registered_at: string;
  verified_at: string | null;
  rejection_reason: string | null;
  tier: string;
  patient_count: number;
  last_login_at: string | null;
}

interface AppData {
  pending: Practitioner[];
  approved: Practitioner[];
  rejected: Practitioner[];
  all: Practitioner[];
}

type Tab = "pending" | "approved" | "rejected";

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PRACTICE_LABELS: Record<string, string> = {
  private: "Private Practice", clinic: "Multi-provider Clinic",
  hospital: "Hospital / Health System", telehealth: "Telehealth Platform",
  wellness: "Wellness Center", corporate: "Corporate Wellness",
  independent: "Independent Consultant",
};

const VOLUME_LABELS: Record<string, string> = {
  under25: "< 25 / mo", "25to100": "25–100 / mo",
  "100to500": "100–500 / mo", over500: "500+ / mo",
};

// ── Logo ─────────────────────────────────────────────────────────────────────
// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Practitioner["verification_status"] }) {
  const cfg = {
    pending:  { label: "Pending",  bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  color: "#FBB724", Icon: Clock },
    approved: { label: "Approved", bg: "rgba(20,184,166,0.12)",  border: "rgba(20,184,166,0.3)",  color: "#14B8A6", Icon: CheckCircle2 },
    rejected: { label: "Rejected", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", color: "#F87171", Icon: XCircle },
  }[status];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({
  prac,
  onClose,
  onConfirm,
}: {
  prac: Practitioner;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "#0F2445", border: "1px solid rgba(201,214,223,0.12)" }}
      >
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Reject application
          </h2>
          <p className="text-sm" style={{ color: "#7A90A8" }}>
            {prac.name} · {prac.email}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7A90A8" }}>
            Reason <span style={{ color: "#4a6080" }}>(optional — included in the email)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Unable to verify license number, insufficient practice details..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#E8F0F5",
            }}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "#7A90A8" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171" }}
          >
            Reject & email
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Application card ──────────────────────────────────────────────────────────
function AppCard({
  prac,
  secret,
  onRefresh,
}: {
  prac: Practitioner;
  secret: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/applications/${prac.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      showToast(data.message, true);
      setTimeout(onRefresh, 1200);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", false);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (reason: string) => {
    setRejectModal(false);
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/applications/${prac.id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      showToast(data.message, true);
      setTimeout(onRefresh, 1200);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", false);
    } finally {
      setRejecting(false);
    }
  };

  const isPending = prac.verification_status === "pending";

  return (
    <>
      {rejectModal && (
        <RejectModal
          prac={prac}
          onClose={() => setRejectModal(false)}
          onConfirm={handleReject}
        />
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0F2445", border: "1px solid rgba(201,214,223,0.08)" }}
      >
        {/* ── Card header ── */}
        <div className="px-5 py-4 flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: "rgba(20,184,166,0.12)", color: "#14B8A6" }}
          >
            {prac.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white truncate">{prac.name}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold"
                style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6" }}
              >
                {prac.credential}
              </span>
              <StatusBadge status={prac.verification_status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs" style={{ color: "#7A90A8" }}>{prac.email}</span>
              <span className="text-xs" style={{ color: "#4a6080" }}>·</span>
              <span className="text-xs" style={{ color: "#7A90A8" }}>{prac.specialty}</span>
              <span className="text-xs" style={{ color: "#4a6080" }}>·</span>
              <span className="text-xs" style={{ color: "#4a6080" }}>Applied {timeAgo(prac.registered_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isPending && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={approving || rejecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(20,184,166,0.15)",
                    border: "1px solid rgba(20,184,166,0.3)",
                    color: "#14B8A6",
                    opacity: approving ? 0.6 : 1,
                  }}
                  data-testid={`button-approve-${prac.id}`}
                >
                  <CheckCircle2 size={12} />
                  {approving ? "Approving…" : "Approve"}
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={approving || rejecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    color: "#F87171",
                    opacity: rejecting ? 0.6 : 1,
                  }}
                  data-testid={`button-reject-${prac.id}`}
                >
                  <XCircle size={12} />
                  {rejecting ? "Rejecting…" : "Reject"}
                </button>
              </>
            )}

            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "#7A90A8", background: "rgba(255,255,255,0.04)" }}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div
            className="mx-5 mb-3 px-4 py-2.5 rounded-xl text-xs font-medium"
            style={{
              background: toast.ok ? "rgba(20,184,166,0.12)" : "rgba(248,113,113,0.12)",
              border: `1px solid ${toast.ok ? "rgba(20,184,166,0.3)" : "rgba(248,113,113,0.3)"}`,
              color: toast.ok ? "#14B8A6" : "#F87171",
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* ── Expanded detail ── */}
        {expanded && (
          <div
            className="px-5 pb-5 space-y-4"
            style={{ borderTop: "1px solid rgba(201,214,223,0.07)" }}
          >
            <div className="pt-4 grid grid-cols-2 gap-3">
              {/* Practice type */}
              <Detail icon={Building2} label="Practice type" value={PRACTICE_LABELS[prac.practice_type] ?? prac.practice_type} />
              {/* Volume */}
              <Detail icon={Users} label="Patient volume" value={VOLUME_LABELS[prac.patient_volume] ?? prac.patient_volume} />
              {/* License */}
              {prac.license_number && (
                <Detail icon={ShieldCheck} label="License #" value={prac.license_number} />
              )}
              {/* Organization */}
              {prac.organization && (
                <Detail icon={Building2} label="Organization" value={prac.organization} />
              )}
              {/* Website */}
              {prac.practice_website && (
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#4a6080" }}>Website</p>
                  <a
                    href={prac.practice_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs underline underline-offset-2"
                    style={{ color: "#14B8A6" }}
                  >
                    <Globe size={11} />
                    {prac.practice_website}
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
              {/* Registered */}
              <Detail icon={ClipboardList} label="Applied" value={formatDate(prac.registered_at)} />
              {/* Verified */}
              {prac.verified_at && (
                <Detail icon={CheckCircle2} label="Approved" value={formatDate(prac.verified_at)} />
              )}
              {/* Rejection reason */}
              {prac.rejection_reason && (
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#4a6080" }}>Rejection note</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#C9D6DF" }}>{prac.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Use case */}
            <div>
              <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#4a6080" }}>How they plan to use Vyvata</p>
              <p
                className="text-sm leading-relaxed px-4 py-3 rounded-xl"
                style={{ color: "#C9D6DF", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {prac.use_case}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: "#4a6080" }}>
        <Icon size={9} />
        {label}
      </p>
      <p className="text-sm" style={{ color: "#C9D6DF" }}>{value}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminClient({ secret }: { secret: string }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) throw new Error("Failed to load applications");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const list = data ? (tab === "pending" ? data.pending : tab === "approved" ? data.approved : data.rejected) : [];

  const TABS: { id: Tab; label: string; count: number; color: string }[] = data
    ? [
        { id: "pending",  label: "Pending",  count: data.pending.length,  color: "#FBB724" },
        { id: "approved", label: "Approved", count: data.approved.length, color: "#14B8A6" },
        { id: "rejected", label: "Rejected", count: data.rejected.length, color: "#F87171" },
      ]
    : [];

  return (
    <div className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <VyvataLogo size={22} />
          <div>
            <span
              className="text-xs font-bold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              VYVATA
            </span>
            <p className="text-xs leading-none mt-0.5" style={{ color: "#4a6080" }}>Admin</p>
          </div>
          <div
            className="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171" }}
          >
            Internal
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "#4a6080" }}>
            Refreshed {timeAgo(lastRefresh.toISOString())}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "#7A90A8" }}
            data-testid="button-refresh"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">

        {/* ── Stats row ── */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pending review", value: data.pending.length,  color: "#FBB724", Icon: Clock },
              { label: "Approved",       value: data.approved.length, color: "#14B8A6", Icon: CheckCircle2 },
              { label: "Rejected",       value: data.rejected.length, color: "#F87171", Icon: XCircle },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="rounded-2xl px-5 py-4"
                style={{ background: "#0F2445", border: "1px solid rgba(201,214,223,0.07)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} style={{ color }} />
                  <span className="text-xs" style={{ color: "#7A90A8" }}>{label}</span>
                </div>
                <p className="text-2xl font-black" style={{ color, fontFamily: "Montserrat, sans-serif" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        {data && (
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: tab === t.id ? "rgba(255,255,255,0.07)" : "transparent",
                  color: tab === t.id ? "#E8F0F5" : "#4a6080",
                }}
                data-testid={`tab-${t.id}`}
              >
                {t.label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums"
                  style={{
                    background: tab === t.id ? `${t.color}22` : "rgba(255,255,255,0.05)",
                    color: tab === t.id ? t.color : "#4a6080",
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {loading && !data && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ background: "#0F2445" }}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            className="px-5 py-4 rounded-2xl flex items-center gap-3"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#FCA5A5" }}
          >
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && data && list.length === 0 && (
          <div
            className="py-16 rounded-2xl flex flex-col items-center gap-3 text-center"
            style={{ background: "#0F2445", border: "1px solid rgba(201,214,223,0.07)" }}
          >
            {tab === "pending" ? (
              <>
                <ClipboardList size={28} style={{ color: "#14B8A6", opacity: 0.4 }} />
                <p className="text-sm font-semibold text-white">No pending applications</p>
                <p className="text-xs" style={{ color: "#4a6080" }}>All caught up — check back when new applications arrive.</p>
              </>
            ) : tab === "approved" ? (
              <>
                <ShieldCheck size={28} style={{ color: "#14B8A6", opacity: 0.4 }} />
                <p className="text-sm font-semibold text-white">No approved practitioners yet</p>
              </>
            ) : (
              <>
                <XCircle size={28} style={{ color: "#F87171", opacity: 0.4 }} />
                <p className="text-sm font-semibold text-white">No rejected applications</p>
              </>
            )}
          </div>
        )}

        {!loading && data && list.length > 0 && (
          <div className="space-y-3">
            {/* Pending banner */}
            {tab === "pending" && list.length > 0 && (
              <div
                className="px-4 py-3 rounded-xl flex items-center gap-2.5"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <Clock size={13} style={{ color: "#FBB724" }} />
                <p className="text-xs" style={{ color: "#FBB724" }}>
                  {list.length} application{list.length > 1 ? "s" : ""} awaiting review. Approving sends the access code email immediately.
                </p>
              </div>
            )}

            {list.map((prac) => (
              <AppCard key={prac.id} prac={prac} secret={secret} onRefresh={fetchData} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 pb-8 flex items-center justify-between">
          <p className="text-xs" style={{ color: "#4a6080" }}>
            {data ? `${data.all.length} total applications` : ""}
          </p>
          <a
            href="/practitioner/dashboard"
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
            style={{ color: "#4a6080" }}
          >
            <User size={11} />
            Practitioner portal
          </a>
        </div>
      </div>
    </div>
  );
}
