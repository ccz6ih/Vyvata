// StackReceipts — Rules Engine
// Deterministic checks: redundancy, interactions, dose, timing conflicts
// No LLM needed here.

import {
  INGREDIENTS,
  findIngredient,
  getInteractions,
  getRedundancies,
  type IngredientRecord,
} from "./ingredients-db";
import type { ParsedIngredient, Goal } from "@/types";

export interface RulesResult {
  matched: IngredientRecord[];
  unmatched: ParsedIngredient[];
  interactions: Array<{
    a: IngredientRecord;
    b: IngredientRecord;
    description: string;
    fix: string;
  }>;
  redundancies: Array<{
    items: IngredientRecord[];
    description: string;
  }>;
  dosageIssues: Array<{
    ingredient: IngredientRecord;
    providedDose?: number;
    issue: "under-dosed" | "over-dosed";
    description: string;
  }>;
  timingConflicts: Array<{
    items: IngredientRecord[];
    description: string;
    fix: string;
  }>;
  goalGaps: Array<{
    goal: Goal;
    suggestedIngredients: IngredientRecord[];
  }>;
  evidenceBreakdown: {
    strong: number;
    moderate: number;
    weak: number;
    none: number;
  };
}

function parseDoseMg(raw: ParsedIngredient): number | undefined {
  if (!raw.dose) return undefined;
  const val = parseFloat(raw.dose);
  if (isNaN(val)) return undefined;
  const unit = (raw.unit || "mg").toLowerCase();
  if (unit === "g") return val * 1000;
  if (unit === "mcg" || unit === "ug") return val / 1000;
  if (unit === "iu") {
    // rough conversions for common vitamins
    return val * 0.000025; // 1 IU Vit D ≈ 0.000025mg
  }
  return val; // assume mg
}

export function runRulesEngine(
  parsed: ParsedIngredient[],
  goals: Goal[]
): RulesResult {
  // Match parsed ingredients to known DB entries
  const matched: IngredientRecord[] = [];
  const unmatched: ParsedIngredient[] = [];
  const parsedDoses = new Map<string, number | undefined>();

  for (const p of parsed) {
    const found = findIngredient(p.raw);
    if (found) {
      // Avoid duplicates
      if (!matched.find((m) => m.name === found.name)) {
        matched.push(found);
        parsedDoses.set(found.name, parseDoseMg(p));
      }
    } else {
      unmatched.push(p);
    }
  }

  // Interactions
  const rawInteractions = getInteractions(matched);
  const interactions = rawInteractions.map(({ a, b }) => {
    const desc = `${a.name} and ${b.name} interact — ${a.interactions.includes(b.name) ? (a.notes || "known interaction") : (b.notes || "known interaction")}`;
    const fix = buildInteractionFix(a, b);
    return { a, b, description: desc, fix };
  });

  // Redundancies
  const rawRedundancies = getRedundancies(matched);
  const redundancies = rawRedundancies.map((items) => ({
    items,
    description: `${items.map((i) => i.name).join(" and ")} overlap — both serve the same purpose. Pick one.`,
  }));

  // Dosage issues
  const dosageIssues: RulesResult["dosageIssues"] = [];
  for (const ing of matched) {
    const dose = parsedDoses.get(ing.name);
    if (dose === undefined) continue;
    if (ing.min_dose_mg && dose < ing.min_dose_mg * 0.6) {
      dosageIssues.push({
        ingredient: ing,
        providedDose: dose,
        issue: "under-dosed",
        description: `${ing.name} at ${dose}mg is likely under-dosed. Effective range: ${ing.min_dose_mg}–${ing.max_dose_mg || "?"}mg.`,
      });
    } else if (ing.max_dose_mg && dose > ing.max_dose_mg * 1.5) {
      dosageIssues.push({
        ingredient: ing,
        providedDose: dose,
        issue: "over-dosed",
        description: `${ing.name} at ${dose}mg exceeds recommended max of ${ing.max_dose_mg}mg.`,
      });
    }
  }

  // Timing conflicts
  const timingConflicts = buildTimingConflicts(matched);

  // Goal gaps — what's missing for stated goals
  const goalGaps = buildGoalGaps(matched, goals);

  // Evidence breakdown
  const evidenceBreakdown = {
    strong: matched.filter((m) => m.evidence_tier === "strong").length,
    moderate: matched.filter((m) => m.evidence_tier === "moderate").length,
    weak: matched.filter((m) => m.evidence_tier === "weak").length,
    none: matched.filter((m) => m.evidence_tier === "none").length,
  };

  return {
    matched,
    unmatched,
    interactions,
    redundancies,
    dosageIssues,
    timingConflicts,
    goalGaps,
    evidenceBreakdown,
  };
}

function buildInteractionFix(a: IngredientRecord, b: IngredientRecord): string {
  const morning = ["morning"];
  const evening = ["evening"];
  if (
    morning.includes(a.timing || "") &&
    morning.includes(b.timing || "")
  ) {
    return `Split ${a.name} and ${b.name} — take one in the morning, one in the evening, at least 4 hours apart.`;
  }
  return `Take ${a.name} and ${b.name} at least 4 hours apart to avoid absorption interference.`;
}

function buildTimingConflicts(
  matched: IngredientRecord[]
): RulesResult["timingConflicts"] {
  const conflicts: RulesResult["timingConflicts"] = [];

  // Iron + calcium at same time
  const iron = matched.find((m) => m.name === "Iron");
  const calcium = matched.find((m) => m.name === "Calcium");
  if (iron && calcium) {
    conflicts.push({
      items: [iron, calcium],
      description:
        "Iron and Calcium compete for absorption. If both are in your morning stack, you're wasting the iron.",
      fix: "Take iron in the morning on an empty stomach. Take calcium at a separate meal.",
    });
  }

  // Stimulating adaptogens at night
  const stimulating = matched.filter(
    (m) => m.name === "Rhodiola Rosea" && m.timing === "morning"
  );
  // (just logged as a note — would need user timing data to flag properly)

  // Melatonin overdose
  const melatonin = matched.find((m) => m.name === "Melatonin");
  const melatoninDose = matched.indexOf(melatonin!);
  if (melatonin) {
    conflicts.push({
      items: [melatonin],
      description:
        "Most melatonin products are 5–10mg, but research shows 0.3–1mg is equally effective with fewer side effects.",
      fix: "Cut your melatonin dose to 0.5–1mg. You'll likely sleep the same or better.",
    });
  }

  return conflicts;
}

function buildGoalGaps(
  matched: IngredientRecord[],
  goals: Goal[]
): RulesResult["goalGaps"] {
  const gaps: RulesResult["goalGaps"] = [];

  // Key recommendations per goal that are commonly missing
  const KEY_FOR_GOAL: Record<Goal, string[]> = {
    sleep: ["Magnesium Glycinate", "Apigenin", "Glycine"],
    energy: ["Creatine Monohydrate", "Vitamin B12", "Vitamin D3"],
    focus: ["Creatine Monohydrate", "L-Theanine", "Lion's Mane"],
    inflammation: ["Fish Oil", "Turmeric", "Vitamin D3"],
    longevity: ["NMN", "Vitamin D3", "Magnesium Glycinate"],
    muscle: ["Creatine Monohydrate", "Vitamin D3"],
    recovery: ["Creatine Monohydrate", "Magnesium Glycinate", "Fish Oil"],
  };

  for (const goal of goals) {
    const keyItems = KEY_FOR_GOAL[goal] || [];
    const missing = keyItems.filter(
      (k) => !matched.find((m) => m.name.toLowerCase() === k.toLowerCase())
    );
    if (missing.length > 0) {
      const suggestions = missing
        .map((name) => INGREDIENTS.find((i) => i.name === name)!)
        .filter(Boolean)
        .slice(0, 2);
      if (suggestions.length > 0) {
        gaps.push({ goal, suggestedIngredients: suggestions });
      }
    }
  }

  return gaps;
}
