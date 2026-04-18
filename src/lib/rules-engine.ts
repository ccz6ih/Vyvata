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
    severity: "critical" | "moderate" | "minor";
  }>;
  redundancies: Array<{
    items: IngredientRecord[];
    description: string;
  }>;
  synergies: Array<{
    items: IngredientRecord[];
    description: string;
    benefit: string;
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
  cyclingRecommendations: Array<{
    ingredient: IngredientRecord;
    reason: string;
    protocol: string;
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

  // Interactions (with severity classification)
  const rawInteractions = getInteractions(matched);
  const interactions = rawInteractions.map(({ a, b }) => {
    const severity = classifyInteractionSeverity(a, b);
    const desc = buildInteractionDescription(a, b);
    const fix = buildInteractionFix(a, b);
    return { a, b, description: desc, fix, severity };
  });

  // Synergies (new: highlight beneficial combinations)
  const synergies = buildSynergies(matched);

  // Redundancies
  const rawRedundancies = getRedundancies(matched);
  const redundancies = rawRedundancies.map((items) => ({
    items,
    description: `${items.map((i) => i.name).join(" and ")} overlap — both serve the same purpose. Pick one.`,
  }));

  // Cycling recommendations (new: for tolerance-building compounds)
  const cyclingRecommendations = buildCyclingRecommendations(matched);

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
    synergies,
    dosageIssues,
    timingConflicts,
    cyclingRecommendations,
    goalGaps,
    evidenceBreakdown,
  };
}

function classifyInteractionSeverity(
  a: IngredientRecord,
  b: IngredientRecord
): "critical" | "moderate" | "minor" {
  // Critical interactions (avoid combination entirely)
  const criticalPairs: [string, string][] = [
    ["Vitamin K2", "Warfarin"],
    ["5-HTP", "SSRIs"],
    ["Mucuna Pruriens", "MAO inhibitors"],
    ["St. John's Wort", "SSRIs"],
    ["Red Yeast Rice", "Statins"],
    ["Berberine", "Metformin"],
  ];

  for (const [x, y] of criticalPairs) {
    if (
      (a.name === x && b.interactions.includes(y)) ||
      (b.name === x && a.interactions.includes(y)) ||
      (a.name === y && b.interactions.includes(x)) ||
      (b.name === y && a.interactions.includes(x))
    ) {
      return "critical";
    }
  }

  // Moderate interactions (timing separation recommended)
  const moderatePairs: [string, string][] = [
    ["Iron", "Calcium"],
    ["Iron", "Zinc"],
    ["Iron", "Magnesium Glycinate"],
    ["Zinc", "Copper"],
    ["Fish Oil", "Vitamin E"],
    ["Fish Oil", "Warfarin"],
    ["Turmeric", "Iron"],
  ];

  for (const [x, y] of moderatePairs) {
    if (
      (a.name === x && b.name === y) ||
      (a.name === y && b.name === x) ||
      (a.name.includes(x) && b.name.includes(y)) ||
      (a.name.includes(y) && b.name.includes(x))
    ) {
      return "moderate";
    }
  }

  return "minor";
}

function buildInteractionDescription(
  a: IngredientRecord,
  b: IngredientRecord
): string {
  // Custom descriptions for known high-risk interactions
  const key = [a.name, b.name].sort().join("|");

  const descriptions: Record<string, string> = {
    "5-HTP|SSRIs":
      "5-HTP + SSRIs can cause serotonin syndrome (dangerous). Do NOT combine without physician supervision.",
    "Berberine|Metformin":
      "Berberine + Metformin both lower blood sugar significantly. Risk of hypoglycemia. Monitor glucose closely.",
    "Calcium|Iron":
      "Calcium blocks iron absorption by ~50%. Your body isn't getting the iron you're paying for.",
    "Copper|Zinc":
      "Zinc competes with copper absorption. Long-term high zinc (>40mg/day) can induce copper deficiency.",
    "Fish Oil|Vitamin E":
      "Fish oil + vitamin E may increase bleeding risk at high doses (>3g EPA/DHA + >400 IU E).",
    "Iron|Turmeric":
      "Turmeric (curcumin) can reduce non-heme iron absorption. Take 2+ hours apart.",
    "Mucuna Pruriens|MAO inhibitors":
      "Mucuna (L-DOPA) + MAO inhibitors can cause hypertensive crisis. Critical interaction.",
    "Red Yeast Rice|Statins":
      "Red yeast rice contains monacolin K (identical to lovastatin). Doubling statin dose increases side effect risk.",
    "Vitamin K2|Warfarin":
      "Vitamin K2 antagonizes warfarin anticoagulation. Can reduce INR. Requires close monitoring.",
    "Zinc|Iron":
      "Zinc and iron compete for absorption. Take 2+ hours apart for best results.",
  };

  const desc =
    descriptions[key] ||
    `${a.name} and ${b.name} interact — ${a.interactions.includes(b.name) ? (a.notes || "known interaction") : (b.notes || "known interaction")}`;

  return desc;
}

function buildSynergies(
  matched: IngredientRecord[]
): RulesResult["synergies"] {
  const synergyList: RulesResult["synergies"] = [];
  const seen = new Set<string>();

  for (const ing of matched) {
    if (ing.synergies.length === 0) continue;

    for (const synergyName of ing.synergies) {
      const partner = matched.find(
        (m) => m.name.toLowerCase() === synergyName.toLowerCase()
      );
      if (!partner) continue;

      // Avoid duplicate pairs
      const key = [ing.name, partner.name].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const description = buildSynergyDescription(ing, partner);
      const benefit = buildSynergyBenefit(ing, partner);

      synergyList.push({
        items: [ing, partner],
        description,
        benefit,
      });
    }
  }

  return synergyList;
}

function buildSynergyDescription(
  a: IngredientRecord,
  b: IngredientRecord
): string {
  const key = [a.name, b.name].sort().join("|");

  const synergies: Record<string, string> = {
    "Black Pepper Extract|Turmeric":
      "Black pepper (piperine) increases turmeric absorption by up to 2000%.",
    "Caffeine|L-Theanine":
      "L-theanine smooths caffeine's stimulation without reducing alertness. Classic 2:1 ratio.",
    "Iron|Vitamin C":
      "Vitamin C enhances non-heme iron absorption by up to 300%. Take together.",
    "Magnesium Glycinate|Vitamin D3":
      "Magnesium is required to convert vitamin D to its active form. Synergistic for bone and immune health.",
    "NMN|Resveratrol":
      "NMN (NAD+ precursor) + resveratrol (sirtuin activator) may amplify longevity pathways.",
    "Vitamin C|Quercetin":
      "Vitamin C regenerates quercetin's antioxidant capacity and enhances absorption.",
    "Vitamin D3|Vitamin K2":
      "Vitamin K2 directs calcium to bones (not arteries) when D3 increases absorption. Essential pairing.",
    "Zinc|Magnesium Glycinate":
      "Zinc + magnesium support testosterone, sleep quality, and recovery. Common in ZMA formulas.",
  };

  return (
    synergies[key] ||
    `${a.name} and ${b.name} work synergistically — enhanced benefits when combined.`
  );
}

function buildSynergyBenefit(a: IngredientRecord, b: IngredientRecord): string {
  const key = [a.name, b.name].sort().join("|");

  const benefits: Record<string, string> = {
    "Black Pepper Extract|Turmeric": "Dramatically improves curcumin bioavailability",
    "Caffeine|L-Theanine": "Smooth focus without jitters or crash",
    "Iron|Vitamin C": "3x better iron absorption",
    "Magnesium Glycinate|Vitamin D3": "Optimizes vitamin D activation and bone health",
    "NMN|Resveratrol": "Amplified cellular energy and longevity signaling",
    "Vitamin C|Quercetin": "Enhanced antioxidant and anti-inflammatory effects",
    "Vitamin D3|Vitamin K2": "Proper calcium distribution — bones not arteries",
    "Zinc|Magnesium Glycinate": "Better sleep, recovery, and hormone support",
  };

  return (
    benefits[key] ||
    "Complementary mechanisms enhance overall effectiveness"
  );
}

function buildCyclingRecommendations(
  matched: IngredientRecord[]
): RulesResult["cyclingRecommendations"] {
  const recommendations: RulesResult["cyclingRecommendations"] = [];

  // Compounds that build tolerance or require cycling
  const cyclingMap: Record<
    string,
    { reason: string; protocol: string }
  > = {
    Caffeine: {
      reason: "Rapid tolerance development to cognitive and energy effects",
      protocol: "Cycle 5 days on, 2 days off. Or take 1-week breaks every 6-8 weeks.",
    },
    "Huperzine A": {
      reason: "Acetylcholinesterase inhibitor — avoid continuous use",
      protocol: "Cycle 5 days on, 2 days off. Maximum 8 weeks continuous use.",
    },
    "Mucuna Pruriens": {
      reason: "L-DOPA can deplete dopamine with chronic use",
      protocol: "Cycle 4 weeks on, 1-2 weeks off. Monitor mood during breaks.",
    },
    Phenylpiracetam: {
      reason: "Stimulating racetam with rapid tolerance",
      protocol: "Use 2-3 times per week maximum. Avoid daily use.",
    },
    Sulbutiamine: {
      reason: "Tolerance develops within 1-2 weeks of daily use",
      protocol: "Cycle 5 days on, 2 days off. Or use only as-needed.",
    },
    Rhodiola: {
      reason:
        "Adaptogen effectiveness may plateau; cycling prevents receptor downregulation",
      protocol: "Cycle 6-8 weeks on, 2 weeks off.",
    },
  };

  for (const [name, { reason, protocol }] of Object.entries(cyclingMap)) {
    const ingredient = matched.find((m) => m.name === name);
    if (ingredient) {
      recommendations.push({ ingredient, reason, protocol });
    }
  }

  return recommendations;
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

  // Expanded key recommendations per goal (updated for 152-ingredient DB)
  const KEY_FOR_GOAL: Record<Goal, string[]> = {
    sleep: [
      "Magnesium Glycinate",
      "Apigenin",
      "Glycine",
      "L-Theanine",
      "Melatonin",
      "Ashwagandha",
      "Lemon Balm",
      "Inositol",
    ],
    energy: [
      "Creatine Monohydrate",
      "Vitamin B12",
      "Vitamin D3",
      "CoQ10",
      "Rhodiola Rosea",
      "Panax Ginseng",
      "Vitamin B1",
      "Iron",
      "L-Tyrosine",
    ],
    focus: [
      "Creatine Monohydrate",
      "L-Theanine",
      "Lion's Mane",
      "Caffeine",
      "Bacopa Monnieri",
      "Alpha-GPC",
      "Acetyl-L-Carnitine",
      "Ginkgo Biloba",
    ],
    inflammation: [
      "Fish Oil",
      "Turmeric",
      "Vitamin D3",
      "Quercetin",
      "Ginger",
      "Boswellia Serrata",
      "EGCG",
      "NAC",
    ],
    longevity: [
      "NMN",
      "Vitamin D3",
      "Magnesium Glycinate",
      "Resveratrol",
      "Pterostilbene",
      "Fisetin",
      "Spermidine",
      "Fish Oil",
      "CoQ10",
      "Sulforaphane",
    ],
    muscle: [
      "Creatine Monohydrate",
      "Vitamin D3",
      "Protein",
      "Beta-Alanine",
      "Citrulline",
      "HMB",
      "Leucine",
      "Betaine",
    ],
    recovery: [
      "Creatine Monohydrate",
      "Magnesium Glycinate",
      "Fish Oil",
      "Vitamin D3",
      "Taurine",
      "L-Carnitine",
      "NAC",
      "Ashwagandha",
    ],
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
        .slice(0, 3); // Increased from 2 to 3 suggestions
      if (suggestions.length > 0) {
        gaps.push({ goal, suggestedIngredients: suggestions });
      }
    }
  }

  return gaps;
}
