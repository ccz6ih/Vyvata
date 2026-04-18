// ══════════════════════════════════════════════════════════════
// Vyvata Scoring Engine
// ══════════════════════════════════════════════════════════════
// Calculates 4 core scores for supplement stack analysis:
// 1. Evidence Score - % of stack with strong clinical backing
// 2. Safety Score - Interaction warnings and contraindications
// 3. Optimization Score - How well stack matches user goals
// 4. Value Score - Cost-effectiveness per evidence-backed benefit
// ══════════════════════════════════════════════════════════════

import { INGREDIENTS } from "./ingredients-db";
import {
  getEvidenceForIngredient,
  getInteractionEvidence,
  hasStrongEvidence,
  getCitationCountForIngredient,
} from "./evidence-helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StackScore = {
  evidenceScore: number;      // 0-100: % with strong evidence
  safetyScore: number;        // 0-100: 100 = no warnings, decreases with interactions
  optimizationScore: number;  // 0-100: how well stack matches goals
  valueScore: number;         // 0-100: placeholder (needs cost data)
  
  // Detailed breakdowns
  evidenceBreakdown: {
    strongEvidence: string[];
    moderateEvidence: string[];
    weakEvidence: string[];
    noEvidence: string[];
    totalCitations: number;
  };
  
  safetyBreakdown: {
    criticalWarnings: Array<{ ingredients: string[]; warning: string }>;
    moderateWarnings: Array<{ ingredients: string[]; warning: string }>;
    minorWarnings: Array<{ ingredients: string[]; warning: string }>;
  };
  
  optimizationBreakdown: {
    goalAligned: string[];
    partiallyAligned: string[];
    notAligned: string[];
    missingForGoals: string[];
  };
  
  insights: string[];
};

export type UserGoals = {
  primary: string[];
  secondary: string[];
};

// ── Evidence Score ────────────────────────────────────────────────────────────
/**
 * Calculate what % of user's stack has strong clinical evidence
 * Formula: (ingredients with strong evidence / total ingredients) * 100
 */
export function calculateEvidenceScore(ingredients: string[]): {
  score: number;
  breakdown: StackScore["evidenceBreakdown"];
} {
  const breakdown = {
    strongEvidence: [] as string[],
    moderateEvidence: [] as string[],
    weakEvidence: [] as string[],
    noEvidence: [] as string[],
    totalCitations: 0,
  };

  for (const name of ingredients) {
    const ingredient = INGREDIENTS.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );

    if (!ingredient) {
      breakdown.noEvidence.push(name);
      continue;
    }

    const tier = ingredient.evidence_tier;
    const citations = getCitationCountForIngredient(name);
    breakdown.totalCitations += citations;

    if (tier === "strong") {
      breakdown.strongEvidence.push(name);
    } else if (tier === "moderate") {
      breakdown.moderateEvidence.push(name);
    } else if (tier === "weak") {
      breakdown.weakEvidence.push(name);
    } else {
      breakdown.noEvidence.push(name);
    }
  }

  const total = ingredients.length;
  const strongCount = breakdown.strongEvidence.length;
  const moderateCount = breakdown.moderateEvidence.length;

  // Score: strong = 100%, moderate = 70%, weak = 40%, none = 0%
  const weightedScore =
    total > 0
      ? ((strongCount * 100 + moderateCount * 70 + breakdown.weakEvidence.length * 40) /
          (total * 100)) *
        100
      : 0;

  return {
    score: Math.round(weightedScore),
    breakdown,
  };
}

// ── Safety Score ──────────────────────────────────────────────────────────────
/**
 * Analyze potential interactions and safety warnings
 * Formula: 100 - (critical warnings × 25 + moderate × 10 + minor × 5)
 */
export function calculateSafetyScore(ingredients: string[]): {
  score: number;
  breakdown: StackScore["safetyBreakdown"];
} {
  const breakdown = {
    criticalWarnings: [] as Array<{ ingredients: string[]; warning: string }>,
    moderateWarnings: [] as Array<{ ingredients: string[]; warning: string }>,
    minorWarnings: [] as Array<{ ingredients: string[]; warning: string }>,
  };

  // Get interaction evidence
  const interactionEvidence = getInteractionEvidence(ingredients);

  for (const evidence of interactionEvidence) {
    // Extract ingredient names from title and related ingredients
    const involvedIngredients = (evidence.relatedIngredients || []).filter((name) =>
      ingredients.some((ing) => ing.toLowerCase() === name.toLowerCase())
    );

    // Categorize by severity based on evidence tier and keywords
    const summary = evidence.summary.toLowerCase();
    const isCritical =
      summary.includes("contraindicated") ||
      summary.includes("severe") ||
      summary.includes("dangerous") ||
      evidence.evidenceTier === "strong";

    const isModerate =
      summary.includes("reduce") ||
      summary.includes("monitor") ||
      summary.includes("caution") ||
      evidence.evidenceTier === "moderate";

    if (isCritical) {
      breakdown.criticalWarnings.push({
        ingredients: involvedIngredients,
        warning: evidence.title,
      });
    } else if (isModerate) {
      breakdown.moderateWarnings.push({
        ingredients: involvedIngredients,
        warning: evidence.title,
      });
    } else {
      breakdown.minorWarnings.push({
        ingredients: involvedIngredients,
        warning: evidence.title,
      });
    }
  }

  // Check individual ingredient interactions
  for (const name of ingredients) {
    const ingredient = INGREDIENTS.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );

    if (!ingredient || !ingredient.interactions.length) continue;

    for (const interaction of ingredient.interactions) {
      const isCritical =
        interaction.toLowerCase().includes("contraindicated") ||
        interaction.toLowerCase().includes("avoid");

      if (isCritical) {
        breakdown.criticalWarnings.push({
          ingredients: [name],
          warning: interaction,
        });
      } else {
        breakdown.moderateWarnings.push({
          ingredients: [name],
          warning: interaction,
        });
      }
    }
  }

  // Calculate score: 100 - (critical × 25 + moderate × 10 + minor × 5)
  const penalty =
    breakdown.criticalWarnings.length * 25 +
    breakdown.moderateWarnings.length * 10 +
    breakdown.minorWarnings.length * 5;

  const score = Math.max(0, 100 - penalty);

  return {
    score,
    breakdown,
  };
}

// ── Optimization Score ────────────────────────────────────────────────────────
/**
 * How well does the stack match user's stated goals?
 * Formula: (aligned ingredients / total) * 100, with bonus for synergies
 */
export function calculateOptimizationScore(
  ingredients: string[],
  userGoals: UserGoals
): {
  score: number;
  breakdown: StackScore["optimizationBreakdown"];
} {
  const allGoals = [...userGoals.primary, ...userGoals.secondary];

  const breakdown = {
    goalAligned: [] as string[],
    partiallyAligned: [] as string[],
    notAligned: [] as string[],
    missingForGoals: [] as string[],
  };

  // Normalize goals to ingredient goal keywords
  const goalKeywords = allGoals.flatMap((goal) => {
    const normalized = goal.toLowerCase().replace(/[_\s]+/g, "_");
    
    // Map quiz goals to ingredient goal keywords
    const mapping: Record<string, string[]> = {
      sleep: ["sleep", "relaxation"],
      energy: ["energy", "vitality", "mitochondrial_health"],
      focus: ["cognitive_enhancement", "focus", "mental_clarity"],
      longevity: ["longevity", "anti_aging", "cellular_health"],
      performance: ["athletic_performance", "strength", "endurance"],
      muscle: ["muscle_growth", "strength"],
      recovery: ["recovery", "inflammation"],
      stress: ["stress_management", "mood"],
      immunity: ["immune_support"],
      gut: ["gut_health", "digestion"],
      inflammation: ["inflammation", "anti_inflammatory"],
    };

    return mapping[normalized] || [normalized];
  });

  // Analyze each ingredient
  for (const name of ingredients) {
    const ingredient = INGREDIENTS.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );

    if (!ingredient) {
      breakdown.notAligned.push(name);
      continue;
    }

    const ingredientGoals = ingredient.goals.map((g) => g.toLowerCase());
    const matchCount = ingredientGoals.filter((g) => goalKeywords.includes(g)).length;

    if (matchCount >= 2) {
      breakdown.goalAligned.push(name);
    } else if (matchCount === 1) {
      breakdown.partiallyAligned.push(name);
    } else {
      breakdown.notAligned.push(name);
    }
  }

  // Identify missing ingredients for key goals
  const missingIngredients = findMissingIngredientsForGoals(
    ingredients,
    goalKeywords
  );
  breakdown.missingForGoals = missingIngredients.slice(0, 5); // Top 5 suggestions

  // Calculate score
  const total = ingredients.length;
  const aligned = breakdown.goalAligned.length;
  const partial = breakdown.partiallyAligned.length;

  const baseScore =
    total > 0 ? ((aligned * 100 + partial * 50) / (total * 100)) * 100 : 0;

  // Bonus for having ingredients from multiple categories (well-rounded stack)
  const categories = new Set(
    ingredients
      .map((name) => {
        const ing = INGREDIENTS.find((i) => i.name.toLowerCase() === name.toLowerCase());
        return ing?.category;
      })
      .filter(Boolean)
  );
  const diversityBonus = Math.min(categories.size * 2, 10);

  const score = Math.min(100, Math.round(baseScore + diversityBonus));

  return {
    score,
    breakdown,
  };
}

/**
 * Find top missing ingredients that would help achieve user goals
 */
function findMissingIngredientsForGoals(
  currentStack: string[],
  goalKeywords: string[]
): string[] {
  const currentStackLower = currentStack.map((s) => s.toLowerCase());

  // Find ingredients that match goals but aren't in stack
  const candidates = INGREDIENTS.filter((ing) => {
    if (currentStackLower.includes(ing.name.toLowerCase())) return false;
    
    const matchesGoal = ing.goals.some((g) =>
      goalKeywords.includes(g.toLowerCase())
    );
    
    return matchesGoal && ing.evidence_tier !== "none";
  });

  // Sort by evidence tier (strong first)
  const sorted = candidates.sort((a, b) => {
    const tierScore = { strong: 3, moderate: 2, weak: 1, none: 0 };
    return tierScore[b.evidence_tier] - tierScore[a.evidence_tier];
  });

  return sorted.slice(0, 5).map((i) => i.name);
}

// ── Value Score ───────────────────────────────────────────────────────────────
/**
 * Cost-effectiveness analysis (placeholder - needs product pricing data)
 * For now, returns neutral 50 with guidance
 */
export function calculateValueScore(ingredients: string[]): {
  score: number;
  message: string;
} {
  // TODO: Implement when product pricing data is available
  // Formula: (total monthly cost / evidence-backed benefits) * quality multiplier
  
  return {
    score: 50,
    message: "Value scoring requires product pricing data. Coming soon!",
  };
}

// ── Main Scoring Function ─────────────────────────────────────────────────────
/**
 * Calculate all 4 scores for a supplement stack
 */
export function calculateStackScores(
  ingredients: string[],
  userGoals: UserGoals
): StackScore {
  const evidence = calculateEvidenceScore(ingredients);
  const safety = calculateSafetyScore(ingredients);
  const optimization = calculateOptimizationScore(ingredients, userGoals);
  const value = calculateValueScore(ingredients);

  // Generate insights
  const insights: string[] = [];

  if (evidence.score >= 80) {
    insights.push(
      `🎯 Excellent evidence quality - ${evidence.breakdown.strongEvidence.length} of ${ingredients.length} have strong clinical backing`
    );
  } else if (evidence.score >= 60) {
    insights.push(
      `✅ Good evidence base, but ${evidence.breakdown.noEvidence.length} ingredients lack strong research`
    );
  } else {
    insights.push(
      `⚠️ Consider replacing ${evidence.breakdown.noEvidence.length} low-evidence ingredients with proven alternatives`
    );
  }

  if (safety.score >= 90) {
    insights.push("✅ No significant safety concerns detected");
  } else if (safety.breakdown.criticalWarnings.length > 0) {
    insights.push(
      `🚨 ${safety.breakdown.criticalWarnings.length} critical interaction(s) require attention`
    );
  } else {
    insights.push(
      `⚠️ ${safety.breakdown.moderateWarnings.length} potential interaction(s) to monitor`
    );
  }

  if (optimization.score >= 80) {
    insights.push(
      `🎯 Well-optimized stack - ${optimization.breakdown.goalAligned.length} ingredients directly support your goals`
    );
  } else if (optimization.breakdown.notAligned.length > 0) {
    insights.push(
      `💡 ${optimization.breakdown.notAligned.length} ingredients don't align with your stated goals - consider swapping`
    );
  }

  if (optimization.breakdown.missingForGoals.length > 0) {
    insights.push(
      `💡 Consider adding: ${optimization.breakdown.missingForGoals.slice(0, 3).join(", ")}`
    );
  }

  if (evidence.breakdown.totalCitations >= 50) {
    insights.push(
      `📚 Your stack is backed by ${evidence.breakdown.totalCitations}+ published studies`
    );
  }

  return {
    evidenceScore: evidence.score,
    safetyScore: safety.score,
    optimizationScore: optimization.score,
    valueScore: value.score,
    evidenceBreakdown: evidence.breakdown,
    safetyBreakdown: safety.breakdown,
    optimizationBreakdown: optimization.breakdown,
    insights,
  };
}
