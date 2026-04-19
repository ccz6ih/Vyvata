// openFDA food-enforcement (recalls) ingester.
// https://open.fda.gov/apis/food/enforcement/
//
// Supplements are classified as "food" by FDA, so recalls live at
// /food/enforcement. We filter by product_description to keep the set
// scoped to supplements / vitamins and match against Vyvata's catalog.

import type { SupabaseClient } from "@supabase/supabase-js";

const OPENFDA_BASE = "https://api.fda.gov/food/enforcement.json";

export interface OpenFdaRecall {
  recall_number: string;
  product_description: string;
  reason_for_recall: string;
  status: string;                  // "Ongoing" | "Completed" | "Terminated"
  classification: string;          // "Class I" | "Class II" | "Class III"
  recalling_firm: string;
  report_date: string;             // YYYYMMDD
  recall_initiation_date?: string;
  product_type: string;            // "Food" for supplements
  voluntary_mandated?: string;
  initial_firm_notification?: string;
  city?: string;
  state?: string;
  country?: string;
  distribution_pattern?: string;
}

const SUPPLEMENT_KEYWORDS = [
  "supplement", "vitamin", "mineral", "probiotic", "omega",
  "magnesium", "zinc", "iron", "calcium", "multivitamin",
  "protein powder", "creatine", "collagen", "herbal",
  "turmeric", "curcumin", "ashwagandha", "melatonin",
];

function isSupplementRecall(r: OpenFdaRecall): boolean {
  const text = `${r.product_description} ${r.reason_for_recall}`.toLowerCase();
  return SUPPLEMENT_KEYWORDS.some((kw) => text.includes(kw));
}

function parseYyyymmdd(s: string | undefined): string | null {
  if (!s || s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function severityFromClassification(c: string): "critical" | "serious" | "moderate" | "minor" {
  // FDA class I = reasonable probability of serious adverse health consequences or death
  if (/class\s*i\b/i.test(c)) return "critical";
  if (/class\s*ii\b/i.test(c)) return "serious";
  if (/class\s*iii\b/i.test(c)) return "moderate";
  return "minor";
}

function violationTypesFromReason(reason: string): string[] {
  const r = reason.toLowerCase();
  const tags: string[] = [];
  if (/salmonella|listeria|e\.?\s*coli|contamination|microbial/.test(r)) tags.push("contamination");
  if (/undeclared|allergen|milk|soy|egg|peanut/.test(r)) tags.push("allergen");
  if (/adulter/.test(r)) tags.push("adulteration");
  if (/mislabel|misbrand|labeling/.test(r)) tags.push("misbranding");
  if (/lead|heavy metal|arsenic|cadmium|mercury/.test(r)) tags.push("heavy_metals");
  if (/glass|metal fragment|foreign/.test(r)) tags.push("foreign_material");
  if (/unapproved|new drug|drug claim/.test(r)) tags.push("unapproved_drug_claim");
  if (/potency|subpotent|superpotent|failed|assay/.test(r)) tags.push("potency");
  return tags;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Fetch up to `limit` supplement recalls going back `daysBack` days.
 * openFDA caps a single response at 1000 rows; pagination is via `skip`.
 */
export async function fetchOpenFdaRecalls(opts?: {
  daysBack?: number;
  limit?: number;
}): Promise<OpenFdaRecall[]> {
  const daysBack = opts?.daysBack ?? 730;
  const limit = Math.min(opts?.limit ?? 250, 1000);

  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  // openFDA (Lucene) wants spaces in the range: `report_date:[A TO B]`.
  // Writing `+TO+` here was an attempt to put URL-encoded spaces in
  // directly, but encodeURIComponent turns `+` into `%2B` — openFDA
  // then saw literal `+` characters and returned a `parse_exception`
  // at column 33. Using a space makes encodeURIComponent emit `%20`
  // correctly, which decodes back to a space on openFDA's side.
  const search = encodeURIComponent(`report_date:[${fmt(start)} TO ${fmt(end)}]`);
  const url = `${OPENFDA_BASE}?search=${search}&limit=${limit}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`openFDA fetch failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { results?: OpenFdaRecall[] };
  return (data.results ?? []).filter(isSupplementRecall);
}

export interface IngestResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Match a recall to a manufacturer (and optionally a product). Returns the
 * match_confidence and the IDs to persist. Exact manufacturer match wins;
 * otherwise ILIKE against products.brand for a secondary hit.
 */
async function matchRecall(
  supabase: SupabaseClient,
  recall: OpenFdaRecall
): Promise<{
  manufacturerId: string | null;
  productId: string | null;
  confidence: "high" | "medium" | "low" | "unmatched";
}> {
  const firm = normalize(recall.recalling_firm);

  if (!firm) return { manufacturerId: null, productId: null, confidence: "unmatched" };

  // 1. Try exact manufacturer name (case-insensitive equality via ILIKE).
  const { data: exactMfr } = await supabase
    .from("manufacturers")
    .select("id, name")
    .ilike("name", firm)
    .limit(1);

  if (exactMfr && exactMfr.length > 0) {
    return {
      manufacturerId: (exactMfr[0] as { id: string }).id,
      productId: null,
      confidence: "high",
    };
  }

  // 2. Substring on manufacturer name (e.g., "NOW Health Group, Inc." ⇄ "NOW Foods")
  const firstToken = firm.split(" ")[0];
  if (firstToken.length >= 3) {
    const { data: fuzzyMfr } = await supabase
      .from("manufacturers")
      .select("id, name")
      .ilike("name", `%${firstToken}%`)
      .limit(5);

    if (fuzzyMfr && fuzzyMfr.length === 1) {
      return {
        manufacturerId: (fuzzyMfr[0] as { id: string }).id,
        productId: null,
        confidence: "medium",
      };
    }
    if (fuzzyMfr && fuzzyMfr.length > 1) {
      return { manufacturerId: null, productId: null, confidence: "low" };
    }
  }

  // 3. Last resort: check if the firm string appears in any product brand.
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

  return { manufacturerId: null, productId: null, confidence: "unmatched" };
}

/**
 * Ingest recalls into compliance_flags. Uses UNIQUE(source, source_id) to
 * dedup; existing rows are updated rather than duplicated (new match or
 * severity can change). Never overwrites resolved rows.
 */
export async function ingestOpenFdaRecalls(
  supabase: SupabaseClient,
  opts?: { daysBack?: number; limit?: number }
): Promise<IngestResult> {
  const result: IngestResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  let recalls: OpenFdaRecall[];
  try {
    recalls = await fetchOpenFdaRecalls(opts);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }
  result.fetched = recalls.length;

  for (const r of recalls) {
    try {
      const match = await matchRecall(supabase, r);
      const row = {
        source: "openfda_recall" as const,
        source_id: r.recall_number,
        subject: `${r.recalling_firm}: ${r.product_description.slice(0, 160)}`,
        severity: severityFromClassification(r.classification),
        violation_types: violationTypesFromReason(r.reason_for_recall),
        raw_data: r as unknown as Record<string, unknown>,
        issued_date: parseYyyymmdd(r.report_date),
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
      result.errors.push(
        `${r.recall_number}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
