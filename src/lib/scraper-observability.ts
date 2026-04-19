// Scraper observability wrapper. Every cron-invoked scraper runs inside
// wrapScraperRun() so a row lands in scraper_runs with start/end/status
// regardless of whether the inner function throws. Keeps instrumentation
// at one call site per scraper instead of try/catch/finally noise in
// every ingester.
//
// Usage:
//   const result = await wrapScraperRun("openfda_recalls", async (rec) => {
//     const { inserted, updated, errors } = await ingestOpenFdaRecalls(...);
//     rec.count(inserted, updated);
//     rec.note({ errorsCollected: errors.length });
//     if (errors.length) rec.partial(`${errors.length} per-source errors`);
//     return { inserted, updated, errors };
//   });
//
// The runner wraps the callback: a success run auto-closes to 'success'
// at the end unless you called rec.partial() / rec.failure(); a throw
// auto-closes to 'failure' with the error message.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase";

interface RunRecorder {
  /** Increment inserted/updated row counts that land in scraper_runs. */
  count(inserted: number, updated?: number): void;
  /** Attach per-source debug info to raw_output. Merged into running bag. */
  note(fragment: Record<string, unknown>): void;
  /** Mark this run as degraded-but-completed. */
  partial(message?: string): void;
  /** Mark this run as failed and attach a short human-readable message. */
  failure(message: string): void;
}

interface RunState {
  inserted: number;
  updated: number;
  notes: Record<string, unknown>;
  explicitStatus: "success" | "partial" | "failure" | null;
  messageOverride: string | null;
}

/**
 * Run an observability-wrapped scraper. Always writes one scraper_runs
 * row, even when the inner function throws. Returns whatever the inner
 * function returned (or rethrows on throw).
 */
export async function wrapScraperRun<T>(
  scraperName: string,
  fn: (rec: RunRecorder) => Promise<T>,
  opts?: { supabase?: SupabaseClient }
): Promise<T> {
  const supabase = opts?.supabase ?? getSupabaseServer();

  const { data: inserted } = await supabase
    .from("scraper_runs")
    .insert({ scraper_name: scraperName, status: null })
    .select("id")
    .single();

  const runId = (inserted as { id: string } | null)?.id ?? null;

  const state: RunState = {
    inserted: 0,
    updated: 0,
    notes: {},
    explicitStatus: null,
    messageOverride: null,
  };

  const rec: RunRecorder = {
    count(insertedRows, updatedRows = 0) {
      state.inserted += insertedRows;
      state.updated += updatedRows;
    },
    note(fragment) {
      state.notes = { ...state.notes, ...fragment };
    },
    partial(message) {
      state.explicitStatus = "partial";
      if (message) state.messageOverride = message;
    },
    failure(message) {
      state.explicitStatus = "failure";
      state.messageOverride = message;
    },
  };

  try {
    const result = await fn(rec);
    if (runId) {
      await supabase
        .from("scraper_runs")
        .update({
          ended_at: new Date().toISOString(),
          status: state.explicitStatus ?? "success",
          rows_inserted: state.inserted,
          rows_updated: state.updated,
          error_message: state.messageOverride,
          raw_output: Object.keys(state.notes).length ? state.notes : null,
        })
        .eq("id", runId);
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from("scraper_runs")
        .update({
          ended_at: new Date().toISOString(),
          status: "failure",
          rows_inserted: state.inserted,
          rows_updated: state.updated,
          error_message: message.slice(0, 500),
          raw_output: Object.keys(state.notes).length ? state.notes : null,
        })
        .eq("id", runId);
    }
    throw err;
  }
}

/**
 * Convenience: most-recent run of each named scraper. Useful for an
 * admin dashboard showing at-a-glance pipeline health.
 */
export async function getLatestRuns(): Promise<
  Array<{
    scraper_name: string;
    started_at: string;
    ended_at: string | null;
    status: "success" | "failure" | "partial" | null;
    rows_inserted: number;
    rows_updated: number;
    error_message: string | null;
  }>
> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("scraper_runs")
    .select("scraper_name, started_at, ended_at, status, rows_inserted, rows_updated, error_message")
    .order("started_at", { ascending: false })
    .limit(50);

  const seen = new Set<string>();
  const latest: Array<{
    scraper_name: string;
    started_at: string;
    ended_at: string | null;
    status: "success" | "failure" | "partial" | null;
    rows_inserted: number;
    rows_updated: number;
    error_message: string | null;
  }> = [];
  for (const row of (data ?? []) as Array<{
    scraper_name: string;
    started_at: string;
    ended_at: string | null;
    status: "success" | "failure" | "partial" | null;
    rows_inserted: number;
    rows_updated: number;
    error_message: string | null;
  }>) {
    if (seen.has(row.scraper_name)) continue;
    seen.add(row.scraper_name);
    latest.push(row);
  }
  return latest;
}
