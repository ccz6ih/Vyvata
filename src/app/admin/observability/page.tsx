// Admin observability dashboard. Surfaces scraper_runs at a glance so
// "is the pipeline alive?" is answerable without a SQL query.
//
// Design: pull last 7 days of scraper_runs in one query, derive per-
// scraper stats in memory (cheap at our run volume). Pass to the client
// component for rendering. Client has a refresh button that re-runs
// this server query via router.refresh().

import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";
import ObservabilityClient, { type ScraperSummary, type ScraperRun } from "./ObservabilityClient";

export const dynamic = "force-dynamic";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

export default async function ObservabilityPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");

  const supabase = getSupabaseServer();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("scraper_runs")
    .select("id, scraper_name, status, rows_inserted, rows_updated, started_at, ended_at, error_message")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(1000);

  const runs = (data ?? []) as unknown as ScraperRun[];

  // Group by scraper_name and compute summaries.
  const grouped = new Map<string, ScraperRun[]>();
  for (const r of runs) {
    const arr = grouped.get(r.scraper_name) ?? [];
    arr.push(r);
    grouped.set(r.scraper_name, arr);
  }

  const now = Date.now();
  const summaries: ScraperSummary[] = [];
  for (const [name, groupRuns] of grouped) {
    // Runs are newest-first already from the query's ORDER BY.
    const latest = groupRuns[0];
    const last10 = groupRuns.slice(0, 10);
    const completed = last10.filter((r) => r.ended_at);
    const successes = last10.filter((r) => r.status === "success");
    const failures = last10.filter((r) => r.status === "failure");
    const partials = last10.filter((r) => r.status === "partial");

    const avgDurationMs =
      completed.length > 0
        ? completed.reduce(
            (sum, r) =>
              sum + (new Date(r.ended_at!).getTime() - new Date(r.started_at).getTime()),
            0
          ) / completed.length
        : null;

    // Sum of writes from runs IN the last 24h only (the dashboard's
    // primary "what did this scraper do today?" question). A week of
    // idempotent upserts would otherwise inflate the number.
    const last24hCutoff = now - 24 * 60 * 60 * 1000;
    const runs24h = groupRuns.filter((r) => new Date(r.started_at).getTime() >= last24hCutoff);
    const rows24hInserted = runs24h.reduce((s, r) => s + (r.rows_inserted ?? 0), 0);
    const rows24hUpdated = runs24h.reduce((s, r) => s + (r.rows_updated ?? 0), 0);

    // Stuck = started but not ended, beyond the threshold.
    const stuck =
      latest && !latest.ended_at && now - new Date(latest.started_at).getTime() > STUCK_THRESHOLD_MS;

    summaries.push({
      name,
      latest,
      runCountInWindow: groupRuns.length,
      avgDurationMs,
      successRate: last10.length > 0 ? successes.length / last10.length : null,
      successCount: successes.length,
      failureCount: failures.length,
      partialCount: partials.length,
      rows24hInserted,
      rows24hUpdated,
      runs24hCount: runs24h.length,
      stuck,
      recentRuns: groupRuns.slice(0, 5),
    });
  }

  // Most recent scraper first so the dashboard naturally scans by activity.
  summaries.sort((a, b) => {
    const at = a.latest ? new Date(a.latest.started_at).getTime() : 0;
    const bt = b.latest ? new Date(b.latest.started_at).getTime() : 0;
    return bt - at;
  });

  // Failure / stuck alerts bubble to the top.
  const alerts = runs.filter(
    (r) =>
      r.status === "failure" ||
      (!r.ended_at && now - new Date(r.started_at).getTime() > STUCK_THRESHOLD_MS)
  );

  return <ObservabilityClient summaries={summaries} alerts={alerts} windowDays={7} />;
}
