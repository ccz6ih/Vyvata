// FDA Warning Letters ingester.
// FDA's warning letters listing is served by a Drupal DataTables AJAX endpoint
// that returns JSON. This is the same transport the public search UI uses.
// URL shape (verified via the site's network inspector):
//
//   https://www.fda.gov/datatables/views/ajax
//     ?view_name=warning_letter_solr_index
//     &view_display_id=warning_letter_solr_block_1
//     &length=100&start=0
//     &field_issuing_office_taxonomy_target_id[]=<tid>   (optional)
//     &search_api_fulltext=dietary+supplement            (optional)
//
// FDA could change this endpoint — we fail soft (catch the error, surface it
// in the ingest result) rather than crash the cron run. The parser reads
// `data` as an array of row arrays (cell HTML strings) matching DataTables
// conventions.
//
// Writes to compliance_flags with source="fda_warning_letter" so it composes
// with the existing scoring pipeline (see src/lib/product-scoring.ts —
// PENALTY_BY_SOURCE.fda_warning_letter = 25).

import type { SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const DT_BASE = "https://www.fda.gov/datatables/views/ajax";
const VIEW_PARAMS =
  "view_name=warning_letter_solr_index&view_display_id=warning_letter_solr_block_1";

export interface FdaWarningLetter {
  letterId: string;          // stable slug from the letter URL (source_id)
  company: string;
  issuedDate: string | null; // YYYY-MM-DD
  subject: string;
  issuingOffice: string | null;
  letterUrl: string;
  violationTypes: string[];
}

export interface IngestResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// DataTables row shape: { data: string[][], recordsTotal, recordsFiltered }.
interface DataTablesResponse {
  data?: unknown[][];
  recordsTotal?: number;
  recordsFiltered?: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function severityFromTypes(types: string[]): "critical" | "serious" | "moderate" | "minor" {
  if (types.includes("unapproved_drug_claim") || types.includes("adulteration")) return "serious";
  if (types.includes("gmp") || types.includes("contamination")) return "serious";
  if (types.includes("misbranding")) return "moderate";
  return "moderate";
}

function classifyViolations(subject: string): string[] {
  const s = subject.toLowerCase();
  const tags: string[] = [];
  if (/\bgmp\b|manufacturing practice|cgmp/.test(s)) tags.push("gmp");
  if (/unapproved|new drug|drug claim|disease claim/.test(s)) tags.push("unapproved_drug_claim");
  if (/misbrand|mislabel|labeling/.test(s)) tags.push("misbranding");
  if (/adulter/.test(s)) tags.push("adulteration");
  if (/contamin|salmonella|listeria|e\.?\s*coli|microbial/.test(s)) tags.push("contamination");
  if (/heavy metal|lead|arsenic|cadmium|mercury/.test(s)) tags.push("heavy_metals");
  return tags;
}

// Each DataTables cell is an HTML fragment (link, div, span). Strip it to text
// and pull href where relevant.
function cellText(html: unknown): string {
  if (typeof html !== "string") return "";
  return cheerio.load(html, {}, false).root().text().replace(/\s+/g, " ").trim();
}
function cellLink(html: unknown): string | null {
  if (typeof html !== "string") return null;
  const href = cheerio.load(html, {}, false)("a").attr("href") ?? null;
  if (!href) return null;
  return href.startsWith("http") ? href : `https://www.fda.gov${href}`;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Derive a stable source_id from the letter URL. Letter URLs take the form
// /inspections-compliance-enforcement-and-criminal-investigations/warning-letters/<company-slug>-<id>-MMDDYYYY
// so the trailing path segment is unique and idempotent across runs.
function letterIdFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return path.split("/").pop() || url;
  } catch {
    return url;
  }
}

/**
 * Fetch the warning letters JSON. Defaults scope to the dietary supplement
 * fulltext — the listing is huge and most letters are out of Vyvata's scope.
 */
export async function fetchFdaWarningLetters(opts?: {
  fulltext?: string;
  length?: number;
}): Promise<FdaWarningLetter[]> {
  const fulltext = opts?.fulltext ?? "dietary supplement";
  const length = Math.min(opts?.length ?? 250, 1000);

  const url = `${DT_BASE}?${VIEW_PARAMS}&length=${length}&start=0&search_api_fulltext=${encodeURIComponent(fulltext)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // FDA's edge returns 403 for unknown UAs — identify as a real browser.
      "User-Agent":
        "Mozilla/5.0 (compatible; VyvataBot/1.0; +https://vyvata.com/contact)",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FDA warning letters fetch failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as DataTablesResponse;
  const rows = json.data ?? [];

  // DataTables column order on the warning letters view (current as of 2026):
  //   [0]=Posted Date, [1]=Letter Issue Date, [2]=Company Name (link),
  //   [3]=Issuing Office, [4]=Subject, [5]=Response Letter, [6]=Closeout Letter.
  // Cells are HTML fragments. If FDA re-orders columns this will yield empty
  // strings rather than misattribute fields.
  const out: FdaWarningLetter[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const issuedDate = parseDate(cellText(row[1]));
    const company = cellText(row[2]);
    const letterUrl = cellLink(row[2]);
    const issuingOffice = cellText(row[3]) || null;
    const subject = cellText(row[4]) || "(no subject)";
    if (!company || !letterUrl) continue;
    const violationTypes = classifyViolations(subject);
    out.push({
      letterId: letterIdFromUrl(letterUrl),
      company,
      issuedDate,
      subject,
      issuingOffice,
      letterUrl,
      violationTypes,
    });
  }
  return out;
}

async function matchLetter(
  supabase: SupabaseClient,
  letter: FdaWarningLetter
): Promise<{
  manufacturerId: string | null;
  productId: string | null;
  confidence: "high" | "medium" | "low" | "unmatched";
}> {
  const firm = normalize(letter.company);
  if (!firm) return { manufacturerId: null, productId: null, confidence: "unmatched" };

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
  }

  return { manufacturerId: null, productId: null, confidence: "unmatched" };
}

/**
 * Ingest warning letters into compliance_flags. Idempotent on (source, source_id).
 * Resolved rows are left alone so admin dismissals survive re-runs.
 */
export async function ingestFdaWarningLetters(
  supabase: SupabaseClient,
  opts?: { fulltext?: string; length?: number }
): Promise<IngestResult> {
  const result: IngestResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  let letters: FdaWarningLetter[];
  try {
    letters = await fetchFdaWarningLetters(opts);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }
  result.fetched = letters.length;

  for (const l of letters) {
    try {
      const match = await matchLetter(supabase, l);
      const row = {
        source: "fda_warning_letter" as const,
        source_id: l.letterId,
        subject: `${l.company}: ${l.subject.slice(0, 160)}`,
        severity: severityFromTypes(l.violationTypes),
        violation_types: l.violationTypes,
        raw_data: l as unknown as Record<string, unknown>,
        issued_date: l.issuedDate,
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
        `${l.letterId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
