// openFDA food adverse events (CAERS) ingester.
// https://open.fda.gov/apis/food/event/
//
// CAERS = Center for Food Safety and Applied Nutrition Adverse Event Reporting
// System. Consumer- and healthcare-provider-reported adverse events for
// foods, supplements, and cosmetics. Events are noisy (self-reported,
// unverified) so we aggregate by brand rather than surfacing individual
// reports — a CAERS compliance flag means "N reports filed against this
// brand in the last 2 years," not "this product harmed someone."
//
// Scoring treats each aggregate as a single minor-severity flag, so the
// weighted safety penalty stays small relative to recalls and warning
// letters (see src/lib/product-scoring.ts).

import type { SupabaseClient } from "@supabase/supabase-js";

const CAERS_BASE = "https://api.fda.gov/food/event.json";

// openFDA count endpoint returns { term, count } aggregates.
interface CountBucket {
  term: string;
  count: number;
}

interface CaersCountResponse {
  results?: CountBucket[];
  meta?: unknown;
}

export interface IngestResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function severityForCount(count: number): "critical" | "serious" | "moderate" | "minor" {
  // Aggregated self-reported reports — never rated critical on their own.
  if (count >= 50) return "serious";
  if (count >= 20) return "moderate";
  return "minor";
}

/**
 * Fetch a histogram of brand names mentioned in recent CAERS reports.
 * `count=products.name_brand.exact` groups by the brand_name field.
 * openFDA caps the result at `limit` bars; we take the top 1000.
 */
export async function fetchCaersBrandHistogram(opts?: {
  daysBack?: number;
  minCount?: number;
}): Promise<CountBucket[]> {
  const daysBack = opts?.daysBack ?? 730;
  const minCount = opts?.minCount ?? 3;

  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const search = encodeURIComponent(`date_started:[${fmt(start)}+TO+${fmt(end)}]`);
  const count = encodeURIComponent("products.name_brand.exact");
  const url = `${CAERS_BASE}?search=${search}&count=${count}&limit=1000`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`openFDA CAERS fetch failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as CaersCountResponse;
  return (data.results ?? []).filter((b) => b.term && b.count >= minCount);
}

async function matchBrand(
  supabase: SupabaseClient,
  brand: string
): Promise<{
  manufacturerId: string | null;
  productId: string | null;
  confidence: "high" | "medium" | "low" | "unmatched";
}> {
  const normalized = normalize(brand);
  if (!normalized) return { manufacturerId: null, productId: null, confidence: "unmatched" };

  // Exact manufacturer match (ILIKE = case-insensitive)
  const { data: exact } = await supabase
    .from("manufacturers")
    .select("id, name")
    .ilike("name", normalized)
    .limit(1);
  if (exact && exact.length === 1) {
    return {
      manufacturerId: (exact[0] as { id: string }).id,
      productId: null,
      confidence: "high",
    };
  }

  // Brand substring on products
  const firstToken = normalized.split(" ")[0];
  if (firstToken.length >= 3) {
    const { data: brandHit } = await supabase
      .from("products")
      .select("id, brand")
      .ilike("brand", `%${firstToken}%`)
      .limit(5);
    if (brandHit && brandHit.length === 1) {
      return {
        manufacturerId: null,
        productId: (brandHit[0] as { id: string }).id,
        confidence: "medium",
      };
    }
    if (brandHit && brandHit.length > 1) {
      return { manufacturerId: null, productId: null, confidence: "low" };
    }
  }

  return { manufacturerId: null, productId: null, confidence: "unmatched" };
}

/**
 * Ingest CAERS brand aggregates into compliance_flags. One flag per brand
 * with >= minCount reports in the last N days. Re-running replaces the
 * aggregate (updates count + severity); resolved rows are left untouched.
 */
export async function ingestCaersEvents(
  supabase: SupabaseClient,
  opts?: { daysBack?: number; minCount?: number }
): Promise<IngestResult> {
  const result: IngestResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  let buckets: CountBucket[];
  try {
    buckets = await fetchCaersBrandHistogram(opts);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }
  result.fetched = buckets.length;

  for (const b of buckets) {
    try {
      const match = await matchBrand(supabase, b.term);
      // Only persist flags we can actually match. Unmatched CAERS aggregates
      // are too noisy to show to an admin — there's no single URL to review.
      if (match.confidence === "unmatched") {
        result.skipped += 1;
        continue;
      }
      // Stable source_id so re-runs update in place rather than duplicate.
      const source_id = `caers:${normalize(b.term).replace(/\s/g, "_")}`;

      const row = {
        source: "caers" as const,
        source_id,
        subject: `${b.term}: ${b.count} adverse event report${b.count === 1 ? "" : "s"} filed in CAERS`,
        severity: severityForCount(b.count),
        violation_types: ["adverse_event"],
        raw_data: { brand: b.term, count: b.count } as Record<string, unknown>,
        issued_date: new Date().toISOString().slice(0, 10),
        matched_manufacturer_id: match.manufacturerId,
        matched_product_id: match.productId,
        match_confidence: match.confidence,
      };

      const { data: existing } = await supabase
        .from("compliance_flags")
        .select("id, resolved_at")
        .eq("source", row.source)
        .eq("source_id", row.source_id)
        .maybeSingle();

      if (existing) {
        if ((existing as { resolved_at: string | null }).resolved_at) {
          result.skipped += 1;
          continue;
        }
        const { error } = await supabase
          .from("compliance_flags")
          .update(row)
          .eq("id", (existing as { id: string }).id);
        if (error) throw error;
        result.updated += 1;
      } else {
        const { error } = await supabase.from("compliance_flags").insert(row);
        if (error) throw error;
        result.inserted += 1;
      }
    } catch (err) {
      result.errors.push(`${b.term}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
