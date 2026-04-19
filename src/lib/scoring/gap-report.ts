// Gap report — pure function. For an AI-inferred score, surface the honest
// upside per dimension that a brand could unlock by submitting documentation.
// Zero new data: this is a lookup against DIMENSION_CAPS plus the product's
// current raw sub-scores.

import {
  DIMENSION_CAPS,
  DIMENSION_IDS,
  AI_INFERRED_MAX,
  VERIFIED_MAX,
  type DimensionId,
} from "./dimension-caps";

export interface DimensionGap {
  id: DimensionId;
  label: string;
  rawScore: number;            // raw 0-100 from the scorer
  aiContribution: number;      // current weighted contribution in AI mode
  verifiedContribution: number; // weighted contribution at full verification
  intakeBonus: number;         // configured intakeBonus for this dim
  upside: number;              // how many integrity points verification unlocks
  requiredEvidence: string[];
}

export interface GapReport {
  aiIntegrity: number;            // reported AI-mode integrity score
  potentialIntegrity: number;     // integrity if brand submitted + dims held
  totalUpside: number;            // potential - ai
  dimensions: DimensionGap[];     // full list for table view
  topOpportunities: DimensionGap[]; // sorted descending by upside, upside>0
}

/**
 * Given the current AI-inferred integrity score and the raw 0-100 sub-scores
 * the product achieved, compute the dimension-by-dimension upside.
 *
 * Upside model: we assume the brand's verified data at minimum matches their
 * current public signal, so the existing raw score holds. The gap for a
 * dimension is therefore `(rawScore/100) * intakeBonus` — the additional
 * weighted contribution unlocked by moving from publicMax to full weight.
 *
 * Caller is expected to pass the *AI-mode integrity score* as `aiIntegrity`
 * — potentialIntegrity is derived from it, not recomputed.
 */
export function calculateGapReport(
  aiIntegrity: number,
  rawSubScores: Record<DimensionId, number>
): GapReport {
  const dimensions: DimensionGap[] = DIMENSION_IDS.map((id) => {
    const cap = DIMENSION_CAPS[id];
    const raw = clamp100(rawSubScores[id] ?? 0);
    const aiContribution = (raw / 100) * cap.publicMax;
    const verifiedContribution = (raw / 100) * cap.weight;
    // Upside is the delta the brand's *current* performance would unlock
    // when verified. Fractional because raw is 0-100, bonus is integer pts.
    const upside = verifiedContribution - aiContribution;
    return {
      id,
      label: cap.label,
      rawScore: Math.round(raw),
      aiContribution: round1(aiContribution),
      verifiedContribution: round1(verifiedContribution),
      intakeBonus: cap.intakeBonus,
      upside: round1(upside),
      requiredEvidence: cap.intakeSources,
    };
  });

  const totalUpside = Math.round(
    dimensions.reduce((sum, d) => sum + d.upside, 0)
  );
  const potentialIntegrity = Math.min(VERIFIED_MAX, aiIntegrity + totalUpside);

  const topOpportunities = [...dimensions]
    .filter((d) => d.upside > 0.5) // only call out meaningful gaps
    .sort((a, b) => b.upside - a.upside)
    .slice(0, 3);

  return {
    aiIntegrity,
    potentialIntegrity,
    totalUpside,
    dimensions,
    topOpportunities,
  };
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export { AI_INFERRED_MAX, VERIFIED_MAX };
