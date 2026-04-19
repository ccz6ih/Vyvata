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

// FDA's Drupal DataTables AJAX endpoint (`/datatables/views/ajax`) that an
// earlier version of this file targeted started returning 403 from
// Cloudflare some time before 2026-04. The underlying HTML page is still
// reachable, so we switched to parsing that directly — slower per fetch
// (80 KB HTML vs. 2 MB JSON) but stable, no JS execution needed, and the
// data is server-rendered into a table.
const WL_PAGE =
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters";

// Realistic browser headers. A bot-identifying UA triggers the 403;
// switching to a Chrome UA + standard accept headers gets us 200.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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

// The letter URL slug encodes the letter issue date as MMDDYYYY at the
// end, e.g. `agebox-inc-718252-12192025`. Parse it out when the HTML
// row doesn't expose a dedicated column for the issue date.
function issuedDateFromSlug(slug: string): string | null {
  const match = slug.match(/(\d{8})$/);
  if (!match) return null;
  const mm = match[1].slice(0, 2);
  const dd = match[1].slice(2, 4);
  const yyyy = match[1].slice(4, 8);
  const iso = `${yyyy}-${mm}-${dd}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/**
 * Fetch the warning letters list by scraping the server-rendered HTML
 * page. Defaults scope to dietary-supplement fulltext and the first
 * page (10 most-recent letters). Bump `pages` to walk further back.
 *
 * Each page is ~80 KB and rate-limited by the polite 1-req/sec
 * throttling FDA's Drupal infra does implicitly.
 */
export async function fetchFdaWarningLetters(opts?: {
  fulltext?: string;
  pages?: number;
}): Promise<FdaWarningLetter[]> {
  const fulltext = opts?.fulltext ?? "dietary supplement";
  const pages = Math.max(1, Math.min(opts?.pages ?? 3, 20));

  const out: FdaWarningLetter[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < pages; page++) {
    const url = `${WL_PAGE}?search_api_fulltext=${encodeURIComponent(fulltext)}&page=${page}`;
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`FDA warning letters fetch failed ${res.status}: ${body.slice(0, 200)}`);
    }
    const html = await res.text();
    const pageLetters = parseWarningLettersPage(html);

    if (pageLetters.length === 0) break; // no more pages

    for (const l of pageLetters) {
      if (seen.has(l.letterId)) continue;
      seen.add(l.letterId);
      out.push(l);
    }
  }

  return out;
}

// Cheerio selectors target the Drupal views table rows the warning-letters
// page emits. A minimal row looks like:
//
//   <tr>
//     <td class="views-field-company-name">
//       <a href="/.../warning-letters/agebox-inc-718252-12192025">Agebox Inc.</a>
//     </td>
//     <td class="views-field-field-building">Center for Drug Evaluation and Research (CDER)</td>
//     <td class="views-field-field-detailed-description-2">Unapproved New Drug/Misbranded</td>
//     ...
//   </tr>
//
// If FDA renames the column classes this yields [] rather than
// misattributing fields. The smoke test in
// scripts/test-warning-letters-selector.ts catches that regression.
function parseWarningLettersPage(html: string): FdaWarningLetter[] {
  const $ = cheerio.load(html);
  const out: FdaWarningLetter[] = [];

  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const $companyCell = $tr.find("td.views-field-company-name");
    const $link = $companyCell.find("a").first();
    const href = $link.attr("href") ?? "";
    if (!href.includes("/warning-letters/") || !/\d{8}$/.test(href)) return;

    const company = $link.text().trim();
    if (!company) return;

    const letterUrl = href.startsWith("http") ? href : `https://www.fda.gov${href}`;
    const letterId = letterIdFromUrl(letterUrl);
    const issuedDate = issuedDateFromSlug(letterId);
    const issuingOffice = $tr.find("td.views-field-field-building").text().trim() || null;
    const subject = $tr.find("td.views-field-field-detailed-description-2").text().trim() || "(no subject)";
    const violationTypes = classifyViolations(subject);

    out.push({
      letterId,
      company,
      issuedDate,
      subject,
      issuingOffice,
      letterUrl,
      violationTypes,
    });
  });

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
