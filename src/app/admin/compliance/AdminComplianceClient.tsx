"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, ShieldCheck, RefreshCw, CheckCircle2,
  ExternalLink, Trash2,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

interface FlagRow {
  id: string;
  source: string;
  source_id: string;
  subject: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  violation_types: string[];
  issued_date: string | null;
  match_confidence: "high" | "medium" | "low" | "unmatched";
  match_notes: string | null;
  resolved_at: string | null;
  manufacturer: { id: string; name: string } | { id: string; name: string }[] | null;
  product: { id: string; brand: string; name: string } | { id: string; brand: string; name: string }[] | null;
}

interface Counts {
  total: number;
  unmatched: number;
  low: number;
  medium: number;
  high: number;
  bySource: Record<string, number>;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#F87171",
  serious: "#FB923C",
  moderate: "#F59E0B",
  minor: "#7A90A8",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "#34D399",
  medium: "#14B8A6",
  low: "#F59E0B",
  unmatched: "#F87171",
};

const SOURCE_LABEL: Record<string, string> = {
  openfda_recall: "openFDA Recall",
  fda_warning_letter: "FDA Warning Letter",
  caers: "CAERS Adverse Event",
  import_alert: "Import Alert",
};

function firstOrSelf<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

export default function AdminComplianceClient() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter ? `?confidence=${filter}` : "";
      const res = await fetch(`/api/admin/compliance/flags${qs}`);
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags ?? []);
        setCounts(data.counts ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const syncRecalls = async () => {
    if (!confirm("Fetch the latest supplement recalls from openFDA? Hits the federal API directly.")) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/compliance/sync-recalls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 730 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncMessage(
        `Fetched ${data.fetched} · inserted ${data.inserted} · updated ${data.updated} · skipped ${data.skipped}${
          data.errors?.length ? ` · ${data.errors.length} errors` : ""
        }`
      );
      await fetchFlags();
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const resolve = async (id: string) => {
    const reason = prompt("Why is this a false positive? (optional)");
    if (reason === null) return;
    const res = await fetch(`/api/admin/compliance/flags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", reason: reason || undefined }),
    });
    if (res.ok) await fetchFlags();
  };

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <header
        className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs" style={{ color: "#7A90A8" }}>
            <ArrowLeft size={12} /> Admin
          </Link>
          <span style={{ color: "#4a6080" }}>·</span>
          <VyvataLogo size={18} />
          <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
            VYVATA
          </span>
          <span className="text-xs" style={{ color: "#4a6080" }}>Compliance</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncRecalls}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(20,184,166,0.12)",
              border: "1px solid rgba(20,184,166,0.3)",
              color: "#14B8A6",
            }}
          >
            {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync openFDA recalls
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            FDA COMPLIANCE PIPELINE
          </p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Enforcement flags
          </h1>
          <p className="text-sm" style={{ color: "#C9D6DF" }}>
            Public-domain FDA enforcement data. Ingested from openFDA food-enforcement
            (recalls), matched against our manufacturers + products. Resolved flags are
            preserved for audit but excluded from scoring.
          </p>
        </div>

        {syncMessage && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
            style={{
              background: "rgba(20,184,166,0.08)",
              border: "1px solid rgba(20,184,166,0.25)",
              color: "#C9D6DF",
            }}
          >
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} style={{ color: "#14B8A6" }}>
              Dismiss
            </button>
          </div>
        )}

        {counts && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniCard label="Total open" value={counts.total} color="#14B8A6" onClick={() => setFilter(null)} active={filter === null} />
            <MiniCard label="High match" value={counts.high} color={CONFIDENCE_COLOR.high} onClick={() => setFilter("high")} active={filter === "high"} />
            <MiniCard label="Medium" value={counts.medium} color={CONFIDENCE_COLOR.medium} onClick={() => setFilter("medium")} active={filter === "medium"} />
            <MiniCard label="Low" value={counts.low} color={CONFIDENCE_COLOR.low} onClick={() => setFilter("low")} active={filter === "low"} />
            <MiniCard label="Unmatched" value={counts.unmatched} color={CONFIDENCE_COLOR.unmatched} onClick={() => setFilter("unmatched")} active={filter === "unmatched"} />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-center py-12" style={{ color: "#7A90A8" }}>Loading…</p>
        ) : flags.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center space-y-3"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
          >
            <ShieldCheck size={32} style={{ color: "#14B8A6" }} className="mx-auto" />
            <p className="text-sm font-semibold text-white">No flags yet</p>
            <p className="text-xs" style={{ color: "#7A90A8" }}>
              Click &ldquo;Sync openFDA recalls&rdquo; to fetch the last 2 years of supplement recalls.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {flags.map((f) => {
              const mfr = firstOrSelf(f.manufacturer);
              const prod = firstOrSelf(f.product);
              const sevColor = SEVERITY_COLOR[f.severity];
              const confColor = CONFIDENCE_COLOR[f.match_confidence];
              return (
                <div
                  key={f.id}
                  className="rounded-xl p-4 space-y-2.5"
                  style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} style={{ color: sevColor }} className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold uppercase tracking-widest">
                        <span style={{ color: sevColor }}>{f.severity}</span>
                        <span style={{ color: "#4a6080" }}>·</span>
                        <span style={{ color: "#7A90A8" }}>{SOURCE_LABEL[f.source] ?? f.source}</span>
                        {f.issued_date && (
                          <>
                            <span style={{ color: "#4a6080" }}>·</span>
                            <span style={{ color: "#7A90A8" }}>{f.issued_date}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        {f.subject}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            background: `${confColor}18`,
                            border: `1px solid ${confColor}40`,
                            color: confColor,
                          }}
                        >
                          match: {f.match_confidence}
                        </span>
                        {mfr && (
                          <span style={{ color: "#C9D6DF" }}>
                            manufacturer: <strong style={{ color: "#14B8A6" }}>{mfr.name}</strong>
                          </span>
                        )}
                        {prod && (
                          <Link
                            href={`/products/${prod.id}`}
                            style={{ color: "#14B8A6" }}
                            className="underline-offset-2 hover:underline"
                          >
                            {prod.brand} · {prod.name}
                            <ExternalLink size={10} className="inline ml-0.5" />
                          </Link>
                        )}
                        {f.violation_types.length > 0 && (
                          <span style={{ color: "#7A90A8" }}>
                            {f.violation_types.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => resolve(f.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(201,214,223,0.12)",
                        color: "#C9D6DF",
                      }}
                      title="Mark as false positive"
                    >
                      <Trash2 size={11} /> Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-center pb-4" style={{ color: "#4a6080" }}>
          <CheckCircle2 size={10} className="inline mr-1" style={{ color: "#14B8A6" }} />
          Public-domain data · US government works (17 USC §105) · openFDA official API
        </p>
      </div>
    </main>
  );
}

function MiniCard({
  label, value, color, onClick, active,
}: {
  label: string; value: number; color: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
      style={{
        background: active ? `${color}14` : "#0F2445",
        border: `1px solid ${active ? `${color}40` : "rgba(201,214,223,0.07)"}`,
      }}
    >
      <p className="text-xs" style={{ color: "#7A90A8" }}>{label}</p>
      <p className="text-2xl font-black leading-none mt-1" style={{ color, fontFamily: "Montserrat, sans-serif" }}>
        {value}
      </p>
    </button>
  );
}
