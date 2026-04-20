"use client";

// Scraper observability dashboard UI. Server component does the data
// pull + rollup; this client handles the refresh button and detail
// reveal. No tables-via-SQL required — everything is surfaced visually.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock,
  Activity, TrendingUp, TrendingDown,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

export interface ScraperRun {
  id: string;
  scraper_name: string;
  status: "success" | "failure" | "partial" | null;
  rows_inserted: number | null;
  rows_updated: number | null;
  started_at: string;
  ended_at: string | null;
  error_message: string | null;
}

export interface ScraperSummary {
  name: string;
  latest: ScraperRun | undefined;
  runCountInWindow: number;
  avgDurationMs: number | null;
  successRate: number | null;
  successCount: number;
  failureCount: number;
  partialCount: number;
  rows24hInserted: number;
  rows24hUpdated: number;
  runs24hCount: number;
  stuck: boolean;
  recentRuns: ScraperRun[];
}

// ─── helpers ─────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function statusColor(s: string | null | undefined, stuck = false): string {
  if (stuck) return "#F59E0B";
  if (s === "success") return "#34D399";
  if (s === "failure") return "#F87171";
  if (s === "partial") return "#F59E0B";
  return "#7A90A8";
}

function statusLabel(s: string | null | undefined, stuck = false): string {
  if (stuck) return "STUCK";
  if (!s) return "RUNNING";
  return s.toUpperCase();
}

// ─── component ───────────────────────────────────────────────

export default function ObservabilityClient({
  summaries,
  alerts,
  windowDays,
}: {
  summaries: ScraperSummary[];
  alerts: ScraperRun[];
  windowDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
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
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
          >
            VYVATA
          </span>
          <span className="text-xs" style={{ color: "#4a6080" }}>
            Observability
          </span>
        </div>
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.05)", color: "#7A90A8" }}
        >
          <RefreshCw size={12} className={pending ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* Intro */}
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            PIPELINE HEALTH
          </p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Scraper observability
          </h1>
          <p className="text-sm" style={{ color: "#C9D6DF" }}>
            Last {windowDays} days · rolled up from <code className="font-mono text-xs" style={{ color: "#14B8A6" }}>scraper_runs</code>
          </p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <AlertBanner alerts={alerts} />
        )}

        {/* Per-scraper cards */}
        {summaries.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center space-y-3"
            style={{
              background: "rgba(17,32,64,0.4)",
              border: "1px dashed rgba(201,214,223,0.12)",
            }}
          >
            <Activity size={32} className="mx-auto" style={{ color: "#14B8A6" }} />
            <p className="text-sm font-semibold text-white">No scraper runs in the last {windowDays} days</p>
            <p className="text-xs" style={{ color: "#7A90A8" }}>
              Trigger a cron from the Vercel dashboard or wait for the next scheduled run.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {summaries.map((s) => (
              <ScraperCard key={s.name} summary={s} />
            ))}
          </div>
        )}

        {/* Legend */}
        <div
          className="rounded-xl p-4 text-xs space-y-2"
          style={{
            background: "rgba(17,32,64,0.4)",
            border: "1px solid rgba(201,214,223,0.08)",
            color: "#7A90A8",
          }}
        >
          <p className="font-bold uppercase tracking-widest" style={{ color: "#C9D6DF" }}>
            Legend
          </p>
          <div className="grid sm:grid-cols-2 gap-y-1">
            <span><LegendDot color="#34D399" /> success — clean run</span>
            <span><LegendDot color="#F59E0B" /> partial / stuck — completed with errors or no ended_at &gt; 10m</span>
            <span><LegendDot color="#F87171" /> failure — threw or timed out</span>
            <span><LegendDot color="#7A90A8" /> running — ended_at still null, under threshold</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: color }} />;
}

function AlertBanner({ alerts }: { alerts: ScraperRun[] }) {
  const failureCount = alerts.filter((a) => a.status === "failure").length;
  const stuckCount = alerts.filter((a) => !a.ended_at).length;
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.3)",
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} style={{ color: "#F87171" }} />
        <p className="text-sm font-bold" style={{ color: "#FCA5A5", fontFamily: "Montserrat, sans-serif" }}>
          {alerts.length} incident{alerts.length === 1 ? "" : "s"} need{alerts.length === 1 ? "s" : ""} attention
          {" · "}
          {failureCount > 0 && `${failureCount} failure${failureCount === 1 ? "" : "s"}`}
          {failureCount > 0 && stuckCount > 0 && " · "}
          {stuckCount > 0 && `${stuckCount} stuck`}
        </p>
      </div>
      <div className="space-y-1.5">
        {alerts.slice(0, 8).map((a) => {
          const stuck = !a.ended_at;
          const color = statusColor(a.status, stuck);
          return (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <span
                className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-semibold"
                style={{ background: `${color}22`, color }}
              >
                {statusLabel(a.status, stuck)}
              </span>
              <span className="flex-1" style={{ color: "#C9D6DF" }}>
                <span className="font-semibold text-white">{a.scraper_name}</span>
                {" · "}
                <span style={{ color: "#7A90A8" }}>{timeAgo(a.started_at)}</span>
                {a.error_message && (
                  <>
                    {" · "}
                    <span className="font-mono text-[11px]" style={{ color: "#F87171" }}>
                      {a.error_message.slice(0, 140)}
                    </span>
                  </>
                )}
              </span>
            </div>
          );
        })}
        {alerts.length > 8 && (
          <p className="text-[11px]" style={{ color: "#7A90A8" }}>
            + {alerts.length - 8} more — inspect via SQL on <code className="font-mono">scraper_runs</code>
          </p>
        )}
      </div>
    </div>
  );
}

function ScraperCard({ summary }: { summary: ScraperSummary }) {
  const s = summary;
  const color = statusColor(s.latest?.status, s.stuck);
  const label = statusLabel(s.latest?.status, s.stuck);

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(17,32,64,0.6)",
        border: "1px solid rgba(201,214,223,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p
            className="text-sm font-bold text-white truncate"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {s.name}
          </p>
          <p className="text-xs" style={{ color: "#7A90A8" }}>
            {s.runCountInWindow} run{s.runCountInWindow === 1 ? "" : "s"} in window
          </p>
        </div>
        <span
          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          {label}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPI
          label="Last ran"
          value={timeAgo(s.latest?.started_at)}
        />
        <KPI
          label="Avg duration"
          value={formatDuration(s.avgDurationMs)}
        />
        <KPI
          label="Success rate"
          value={
            s.successRate == null
              ? "—"
              : `${Math.round(s.successRate * 100)}%`
          }
          accent={
            s.successRate == null
              ? undefined
              : s.successRate >= 0.9
              ? "#34D399"
              : s.successRate >= 0.6
              ? "#F59E0B"
              : "#F87171"
          }
        />
      </div>

      {/* 24h row activity */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "#7A90A8" }}>Last 24h</span>
        <span className="tabular-nums" style={{ color: "#C9D6DF" }}>
          {s.runs24hCount} runs · {s.rows24hInserted} inserted · {s.rows24hUpdated} updated
        </span>
      </div>

      {/* Recent runs mini-timeline */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
          Recent runs
        </p>
        {s.recentRuns.length === 0 ? (
          <p className="text-xs" style={{ color: "#4a6080" }}>No runs in window.</p>
        ) : (
          <div className="space-y-1">
            {s.recentRuns.map((r) => {
              const stuck = !r.ended_at;
              const runColor = statusColor(r.status, stuck);
              const dur =
                r.ended_at
                  ? new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()
                  : null;
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <Dot color={runColor} />
                  <span className="w-20 tabular-nums" style={{ color: "#7A90A8" }}>
                    {timeAgo(r.started_at)}
                  </span>
                  <span className="w-16 tabular-nums" style={{ color: "#C9D6DF" }}>
                    {formatDuration(dur)}
                  </span>
                  <span className="flex-1 tabular-nums text-right" style={{ color: "#7A90A8" }}>
                    {(r.rows_inserted ?? 0) > 0 || (r.rows_updated ?? 0) > 0
                      ? `+${r.rows_inserted ?? 0} / ~${r.rows_updated ?? 0}`
                      : "no rows"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
        {label}
      </p>
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: accent ?? "#C9D6DF", fontFamily: "Montserrat, sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />;
}
