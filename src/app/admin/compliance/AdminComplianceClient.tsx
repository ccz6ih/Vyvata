"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, ShieldCheck, RefreshCw, CheckCircle2,
  ExternalLink, Trash2, Link as LinkIcon, X, Search,
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
  const [matchingFlag, setMatchingFlag] = useState<FlagRow | null>(null);

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

  const syncAll = async () => {
    if (!confirm("Fetch latest enforcement data from openFDA (recalls + CAERS adverse events)? Hits federal APIs directly.")) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/compliance/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      const rec = data.sources?.openfda_recall;
      const cae = data.sources?.caers;
      setSyncMessage(
        `Recalls: ${rec.inserted} new, ${rec.updated} updated · CAERS: ${cae.inserted} new, ${cae.updated} updated${
          data.totals.errors ? ` · ${data.totals.errors} errors` : ""
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
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(20,184,166,0.12)",
              border: "1px solid rgba(20,184,166,0.3)",
              color: "#14B8A6",
            }}
          >
            {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync openFDA
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
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {f.match_confidence !== "high" && (
                        <button
                          onClick={() => setMatchingFlag(f)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            background: "rgba(20,184,166,0.1)",
                            border: "1px solid rgba(20,184,166,0.25)",
                            color: "#14B8A6",
                          }}
                          title="Manually match this flag to a manufacturer or product"
                        >
                          <LinkIcon size={11} /> Match
                        </button>
                      )}
                      <button
                        onClick={() => resolve(f.id)}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
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
                </div>
              );
            })}
          </div>
        )}

        {matchingFlag && (
          <MatchModal
            flag={matchingFlag}
            onClose={() => setMatchingFlag(null)}
            onMatched={async () => {
              setMatchingFlag(null);
              await fetchFlags();
            }}
          />
        )}

        <p className="text-xs text-center pb-4" style={{ color: "#4a6080" }}>
          <CheckCircle2 size={10} className="inline mr-1" style={{ color: "#14B8A6" }} />
          Public-domain data · US government works (17 USC §105) · openFDA official API
        </p>
      </div>
    </main>
  );
}

function MatchModal({
  flag, onClose, onMatched,
}: {
  flag: FlagRow;
  onClose: () => void;
  onMatched: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    manufacturers: Array<{ id: string; name: string; country: string | null }>;
    products: Array<{ id: string; brand: string; name: string; category: string }>;
  }>({ manufacturers: [], products: [] });
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ manufacturers: [], products: [] });
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/compliance/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const applyMatch = async (body: { manufacturerId?: string; productId?: string; notes?: string }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/compliance/flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match", ...body }),
      });
      if (res.ok) onMatched();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{
          background: "#0E2A50",
          border: "1px solid rgba(201,214,223,0.12)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#14B8A6" }}>
              Manual match
            </p>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {flag.subject}
            </h3>
            <p className="text-xs" style={{ color: "#7A90A8" }}>
              Current confidence: <span style={{ color: CONFIDENCE_COLOR[flag.match_confidence] }}>{flag.match_confidence}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ color: "#7A90A8" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#7A90A8" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search manufacturer or product name…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-white placeholder:text-[#4a6080]"
            style={{
              background: "rgba(11,31,59,0.6)",
              border: "1px solid rgba(201,214,223,0.12)",
            }}
          />
        </div>

        {query.trim().length >= 2 && results.manufacturers.length === 0 && results.products.length === 0 && !searching && (
          <p className="text-xs" style={{ color: "#7A90A8" }}>No matches. Try a different spelling.</p>
        )}

        {results.manufacturers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
              Manufacturers
            </p>
            {results.manufacturers.map((m) => (
              <button
                key={m.id}
                disabled={saving}
                onClick={() => applyMatch({ manufacturerId: m.id, notes: `matched to manufacturer ${m.name}` })}
                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between"
                style={{
                  background: "rgba(11,31,59,0.6)",
                  border: "1px solid rgba(201,214,223,0.08)",
                  color: "#C9D6DF",
                }}
              >
                <span>
                  <strong style={{ color: "#14B8A6" }}>{m.name}</strong>
                  {m.country && <span style={{ color: "#7A90A8" }}> · {m.country}</span>}
                </span>
                <LinkIcon size={11} style={{ color: "#14B8A6" }} />
              </button>
            ))}
          </div>
        )}

        {results.products.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
              Products
            </p>
            {results.products.map((p) => (
              <button
                key={p.id}
                disabled={saving}
                onClick={() => applyMatch({ productId: p.id, notes: `matched to product ${p.brand} · ${p.name}` })}
                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between"
                style={{
                  background: "rgba(11,31,59,0.6)",
                  border: "1px solid rgba(201,214,223,0.08)",
                  color: "#C9D6DF",
                }}
              >
                <span>
                  <strong style={{ color: "#14B8A6" }}>{p.brand}</strong>
                  <span style={{ color: "#C9D6DF" }}> · {p.name}</span>
                  <span style={{ color: "#7A90A8" }}> · {p.category}</span>
                </span>
                <LinkIcon size={11} style={{ color: "#14B8A6" }} />
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] pt-2" style={{ color: "#4a6080" }}>
          Manual match sets confidence to <span style={{ color: "#34D399" }}>high</span> and is persisted on the flag row.
        </p>
      </div>
    </div>
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
