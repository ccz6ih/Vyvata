// StackReceipts — Stack Parser
// Handles messy input: bulleted lists, comma-separated, line-breaks,
// dose extraction, and LLM fallback for ambiguous inputs.

import type { ParsedIngredient } from "@/types";
import { findIngredient } from "./ingredients-db";

const DOSE_REGEX =
  /(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g|iu|IU|Mg|MCG|G|MG|IU|billion\s*cfu|billion\s*cfus|cfu)/i;

export function parseStackText(raw: string): ParsedIngredient[] {
  if (!raw.trim()) return [];

  // Split on common delimiters: newlines, commas, semicolons, bullets
  const lines = raw
    .split(/[\n\r,;•\-–|]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 200);

  const results: ParsedIngredient[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = parseSingleLine(line);
    if (!parsed) continue;

    // Deduplicate
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(parsed);
  }

  return results;
}

function parseSingleLine(line: string): ParsedIngredient | null {
  // Clean up common noise
  let cleaned = line
    .replace(/^\d+\.\s*/, "") // remove numbering
    .replace(/^[-•*]\s*/, "") // remove bullets
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length < 2) return null;

  // Extract dose
  const doseMatch = cleaned.match(DOSE_REGEX);
  let dose: string | undefined;
  let unit: string | undefined;

  if (doseMatch) {
    dose = doseMatch[1];
    unit = doseMatch[2].toLowerCase();
    // Remove dose from name
    cleaned = cleaned
      .replace(doseMatch[0], "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Remove trailing parentheticals like (capsules), (softgels), (serving)
  const name = cleaned
    .replace(/\(.*?\)/g, "")
    .replace(/capsules?|softgels?|tablets?|gummies?|servings?/gi, "")
    .trim();

  if (!name) return null;

  return {
    name,
    dose,
    unit,
    raw: line,
  };
}

// Score 0-100 based on rules engine output
export function computeScore(
  matched: number,
  totalParsed: number,
  interactionCount: number,
  redundancyCount: number,
  weakEvidenceCount: number,
  goalGapCount: number
): number {
  if (totalParsed === 0) return 50;

  let score = 100;

  // Penalize for weak/no evidence ingredients
  const weakRatio = weakEvidenceCount / Math.max(matched, 1);
  score -= Math.round(weakRatio * 25);

  // Penalize for interactions
  score -= interactionCount * 12;

  // Penalize for redundancies
  score -= redundancyCount * 8;

  // Penalize for goal gaps
  score -= Math.min(goalGapCount * 5, 15);

  // Penalize for unmatched (unknown) ingredients
  const unknownRatio = (totalParsed - matched) / Math.max(totalParsed, 1);
  score -= Math.round(unknownRatio * 10);

  return Math.max(20, Math.min(100, score));
}
