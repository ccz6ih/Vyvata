// Product scoring — produces the VSF integrity score for a single product.
// Pure functions only; no I/O. Consumers (API route, admin UI) pass in
// plain DB-shaped data and get back scores + tier + breakdowns to persist.
//
// Two-path scoring (see docs/UI-V2-AND-SUBMISSION-PLAN.md §1.3):
//   scoreProduct(input)     → verified-mode score (backward-compat)
//   scoreProductDual(input) → { ai_inferred, verified? } — the new entrypoint
// The math is identical across modes; only per-dimension weights change via
// modeWeight() from dimension-caps.ts.

import { findIngredient } from "./ingredients-db";
import {
  DIMENSION_IDS,
  modeWeight,
  type DimensionId,
  type ScoreMode,
} from "./scoring/dimension-caps";

// ── DB-shaped inputs ─────────────────────────────────────────────────────────

export interface ProductRow {
  id: string;
  brand: string;
  name: string;
  manufacturer_id: string | null;
}

export interface ProductIngredientRow {
  ingredient_name: string;
  dose: number;
  unit: string;
  form: string | null;
  bioavailability: "high" | "medium" | "low" | null;
  is_proprietary_blend: boolean;
}

export interface CertificationRow {
  type: string; // enum checked in schema
  verified: boolean;
}

export interface ManufacturerRow {
  gmp_certified: boolean;
  fda_registered: boolean;
  third_party_tested: boolean;
}

export interface ComplianceFlagRow {
  source: "openfda_recall" | "fda_warning_letter" | "caers" | "import_alert";
  severity: "critical" | "serious" | "moderate" | "minor";
  issued_date: string | null;
}

// ── Output shape (mirrors product_scores columns) ────────────────────────────

export type Tier = "rejected" | "standard" | "verified" | "elite";

export interface EvidenceBreakdown {
  perIngredient: Array<{ name: string; tier: string; score: number }>;
  totalCitations: number;
}
export interface SafetyBreakdown {
  interactions: string[];
  warningCount: number;
  compliance_penalty: number;
  compliance_flags: Array<{ source: string; severity: string; issued_date: string | null }>;
}
export interface FormulationBreakdown {
  bioavailability: number;
  doseAccuracy: number;
  transparency: number;
  perIngredient: Array<{ name: string; bioavailability: string | null; form: string | null; doseOk: boolean | null }>;
}
export interface ManufacturingBreakdown {
  gmp: boolean;
  fdaRegistered: boolean;
  thirdPartyTested: boolean;
}
export interface TransparencyBreakdown {
  proprietaryBlend: boolean;
  verifiedCertifications: string[];
}

export interface ProductScore {
  evidence: number;
  safety: number;
  formulation: number;
  manufacturing: number;
  transparency: number;
  sustainability: number;
  integrity: number;
  tier: Tier;
  breakdowns: {
    evidence: EvidenceBreakdown;
    safety: SafetyBreakdown;
    formulation: FormulationBreakdown;
    manufacturing: ManufacturingBreakdown;
    transparency: TransparencyBreakdown;
  };
  certificationBonus: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

// Verified-mode weights (sum to 1.0). Same as VSF-ROADMAP.md; kept here for
// backward compatibility with callers that read this constant directly. Live
// authority for per-mode weights is src/lib/scoring/dimension-caps.ts.
const WEIGHTS = {
  evidence:       0.25,
  safety:         0.15,
  formulation:    0.20,
  manufacturing:  0.20,
  transparency:   0.12,
  sustainability: 0.08,
};

const EVIDENCE_POINTS: Record<string, number> = {
  strong: 100,
  moderate: 70,
  weak: 40,
  none: 10,
};

const BIOAVAILABILITY_POINTS: Record<string, number> = {
  high: 100,
  medium: 70,
  low: 40,
};

// Premium third-party certifications — meaningful integrity signal.
const PREMIUM_CERTS = new Set([
  "nsf_sport",
  "nsf_gmp",
  "usp_verified",
  "informed_sport",
  "informed_choice",
]);

// Lifestyle / compliance certifications — minor bump only.
const MINOR_CERT_BUMP = 3;
const PREMIUM_CERT_BUMP = 10;
const MAX_CERT_BONUS = 15;

// ── Dimension scorers ───────────────────────────────────────────────────────

function scoreEvidence(ingredients: ProductIngredientRow[]): { score: number; breakdown: EvidenceBreakdown } {
  if (ingredients.length === 0) {
    return { score: 0, breakdown: { perIngredient: [], totalCitations: 0 } };
  }
  const per = ingredients.map((pi) => {
    const master = findIngredient(pi.ingredient_name);
    const tier = master?.evidence_tier ?? "none";
    return { name: pi.ingredient_name, tier, score: EVIDENCE_POINTS[tier] ?? 10 };
  });
  const avg = per.reduce((a, b) => a + b.score, 0) / per.length;
  return {
    score: Math.round(avg),
    breakdown: { perIngredient: per, totalCitations: 0 },
  };
}

function scoreSafety(
  ingredients: ProductIngredientRow[],
  complianceFlags: ComplianceFlagRow[]
): { score: number; breakdown: SafetyBreakdown } {
  const interactions: string[] = [];
  // Cross-check each pair against the ingredient-db's declared interactions
  for (let i = 0; i < ingredients.length; i++) {
    const a = findIngredient(ingredients[i].ingredient_name);
    if (!a) continue;
    for (let j = i + 1; j < ingredients.length; j++) {
      const b = findIngredient(ingredients[j].ingredient_name);
      if (!b) continue;
      if (a.interactions.some((n) => n.toLowerCase() === b.name.toLowerCase())) {
        interactions.push(`${a.name} + ${b.name}`);
      }
    }
  }

  // Compliance penalty: every unresolved FDA action against this product or
  // its manufacturer knocks points off the safety dimension. Harder sources
  // (warning letters, recalls with severe classifications) cost more.
  const PENALTY_BY_SOURCE: Record<ComplianceFlagRow["source"], number> = {
    openfda_recall: 15,
    fda_warning_letter: 25,
    import_alert: 15,
    caers: 3,
  };
  const SEVERITY_MULTIPLIER: Record<ComplianceFlagRow["severity"], number> = {
    critical: 1.5,
    serious: 1.2,
    moderate: 1.0,
    minor: 0.6,
  };
  let compliancePenalty = 0;
  for (const f of complianceFlags) {
    compliancePenalty += (PENALTY_BY_SOURCE[f.source] ?? 0) * (SEVERITY_MULTIPLIER[f.severity] ?? 1);
  }
  // Cap the penalty so safety never goes negative from flags alone.
  compliancePenalty = Math.min(80, Math.round(compliancePenalty));

  const interactionPenalty = interactions.length * 20;
  const score = Math.max(0, 100 - interactionPenalty - compliancePenalty);

  return {
    score,
    breakdown: {
      interactions,
      warningCount: interactions.length,
      compliance_penalty: compliancePenalty,
      compliance_flags: complianceFlags.map((f) => ({
        source: f.source,
        severity: f.severity,
        issued_date: f.issued_date,
      })),
    },
  };
}

function scoreFormulation(ingredients: ProductIngredientRow[]): { score: number; breakdown: FormulationBreakdown } {
  if (ingredients.length === 0) {
    return {
      score: 0,
      breakdown: { bioavailability: 0, doseAccuracy: 0, transparency: 0, perIngredient: [] },
    };
  }

  const bioPoints = ingredients.map((pi) => {
    if (pi.bioavailability) return BIOAVAILABILITY_POINTS[pi.bioavailability] ?? 50;
    // Fallback: if not labelled, assume medium bioavailability (70)
    return 70;
  });
  const bioavailability = bioPoints.reduce((a, b) => a + b, 0) / bioPoints.length;

  const doseChecks = ingredients.map((pi) => {
    const master = findIngredient(pi.ingredient_name);
    if (!master || master.min_dose_mg == null || master.max_dose_mg == null) {
      return { name: pi.ingredient_name, ok: null as boolean | null };
    }
    // Unit normalisation is out of scope here — if unit is "mg" we compare directly;
    // anything else (mcg, IU, g) we skip the check rather than false-flag.
    if (pi.unit.toLowerCase() !== "mg") return { name: pi.ingredient_name, ok: null };
    const inRange = pi.dose >= master.min_dose_mg * 0.6 && pi.dose <= master.max_dose_mg * 1.5;
    return { name: pi.ingredient_name, ok: inRange };
  });
  const evaluable = doseChecks.filter((d) => d.ok !== null);
  const doseAccuracy =
    evaluable.length === 0
      ? 75 // neutral default when we can't evaluate
      : (evaluable.filter((d) => d.ok).length / evaluable.length) * 100;

  // Transparency: penalise proprietary blends heavily
  const propBlendCount = ingredients.filter((i) => i.is_proprietary_blend).length;
  const transparency = Math.max(0, 100 - propBlendCount * 40);

  // Composite: bio 50%, dose 30%, transparency 20%
  const score = Math.round(bioavailability * 0.5 + doseAccuracy * 0.3 + transparency * 0.2);

  return {
    score,
    breakdown: {
      bioavailability: Math.round(bioavailability),
      doseAccuracy: Math.round(doseAccuracy),
      transparency: Math.round(transparency),
      perIngredient: ingredients.map((pi, idx) => ({
        name: pi.ingredient_name,
        bioavailability: pi.bioavailability,
        form: pi.form,
        doseOk: doseChecks[idx].ok,
      })),
    },
  };
}

function scoreManufacturing(m: ManufacturerRow | null): { score: number; breakdown: ManufacturingBreakdown } {
  if (!m) {
    return {
      score: 50,
      breakdown: { gmp: false, fdaRegistered: false, thirdPartyTested: false },
    };
  }
  let score = 0;
  if (m.gmp_certified) score += 40;
  if (m.third_party_tested) score += 40;
  if (m.fda_registered) score += 20;
  return {
    score,
    breakdown: { gmp: m.gmp_certified, fdaRegistered: m.fda_registered, thirdPartyTested: m.third_party_tested },
  };
}

function scoreTransparency(
  ingredients: ProductIngredientRow[],
  certs: CertificationRow[]
): { score: number; breakdown: TransparencyBreakdown } {
  const proprietary = ingredients.some((i) => i.is_proprietary_blend);
  const verified = certs.filter((c) => c.verified).map((c) => c.type);
  let score = proprietary ? 40 : 85;
  // Verified certs boost the product's overall disclosure posture
  if (verified.length >= 2) score += 10;
  else if (verified.length === 1) score += 5;
  score = Math.min(100, score);
  return { score, breakdown: { proprietaryBlend: proprietary, verifiedCertifications: verified } };
}

function certificationBonus(certs: CertificationRow[]): number {
  let bonus = 0;
  for (const c of certs) {
    if (!c.verified) continue;
    bonus += PREMIUM_CERTS.has(c.type) ? PREMIUM_CERT_BUMP : MINOR_CERT_BUMP;
  }
  return Math.min(MAX_CERT_BONUS, bonus);
}

function tierFor(score: number): Tier {
  if (score >= 90) return "elite";
  if (score >= 75) return "verified";
  if (score >= 60) return "standard";
  return "rejected";
}

// ── Public entrypoint ────────────────────────────────────────────────────────

export interface ScoreInputs {
  product: ProductRow;
  ingredients: ProductIngredientRow[];
  certifications: CertificationRow[];
  manufacturer: ManufacturerRow | null;
  complianceFlags?: ComplianceFlagRow[];
  /**
   * Present when an approved brand submission has unlocked verified mode.
   * Shape is deliberately open-ended for now — Phase 3 will formalize it.
   * When absent, scoreProductDual() returns `verified: null`.
   */
  brandSubmission?: Record<string, unknown>;
}

export interface DualScoreResult {
  ai_inferred: ProductScore;
  verified: ProductScore | null;
}

/**
 * Run every dimension scorer once (they're mode-independent), then produce
 * one ProductScore per mode. Weights differ by mode via modeWeight(); the
 * cert bonus is public-data-derived and applies identically to both modes.
 */
export function scoreProductDual(input: ScoreInputs): DualScoreResult {
  const evidence = scoreEvidence(input.ingredients);
  const safety = scoreSafety(input.ingredients, input.complianceFlags ?? []);
  const formulation = scoreFormulation(input.ingredients);
  const manufacturing = scoreManufacturing(input.manufacturer);
  const transparency = scoreTransparency(input.ingredients, input.certifications);
  const sustainability = 60; // placeholder until we wire sustainability signals

  // Raw 0-100 dim scores used by both modes.
  const dimScores: Record<DimensionId, number> = {
    evidence: evidence.score,
    safety: safety.score,
    formulation: formulation.score,
    manufacturing: manufacturing.score,
    transparency: transparency.score,
    sustainability,
  };

  const bonus = certificationBonus(input.certifications);

  const compose = (mode: ScoreMode): ProductScore => {
    // Each dim contributes (raw/100) * modeWeight. In verified mode the sum
    // of mode weights is 100; in ai_inferred mode it equals AI_INFERRED_MAX.
    const weighted = DIMENSION_IDS.reduce(
      (sum, id) => sum + (dimScores[id] / 100) * modeWeight(id, mode),
      0
    );
    const integrity = Math.min(100, Math.round(weighted + bonus));
    return {
      evidence: evidence.score,
      safety: safety.score,
      formulation: formulation.score,
      manufacturing: manufacturing.score,
      transparency: transparency.score,
      sustainability,
      integrity,
      tier: tierFor(integrity),
      certificationBonus: bonus,
      breakdowns: {
        evidence: evidence.breakdown,
        safety: safety.breakdown,
        formulation: formulation.breakdown,
        manufacturing: manufacturing.breakdown,
        transparency: transparency.breakdown,
      },
    };
  };

  return {
    ai_inferred: compose("ai_inferred"),
    verified: input.brandSubmission ? compose("verified") : null,
  };
}

/**
 * Backward-compatible entrypoint. Legacy callers expect the full-weight
 * score (all dims sum to 100), not the AI-inferred cap. Preserves behavior
 * by unconditionally computing verified mode, independent of whether a
 * brand submission exists.
 *
 * New code should call scoreProductDual() and handle both modes explicitly.
 */
export function scoreProduct(input: Omit<ScoreInputs, "brandSubmission">): ProductScore {
  return scoreProductDual({ ...input, brandSubmission: {} }).verified!;
}
