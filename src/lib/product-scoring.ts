// Product scoring — produces the VSF integrity score for a single product.
// Pure functions only; no I/O. Consumers (API route, admin UI) pass in
// plain DB-shaped data and get back scores + tier + breakdowns to persist.

import { findIngredient } from "./ingredients-db";

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

// ── Output shape (mirrors product_scores columns) ────────────────────────────

export type Tier = "rejected" | "standard" | "verified" | "elite";

export interface EvidenceBreakdown {
  perIngredient: Array<{ name: string; tier: string; score: number }>;
  totalCitations: number;
}
export interface SafetyBreakdown {
  interactions: string[];
  warningCount: number;
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

// VSF dimension weights (sum to 1.0). Matches VSF-ROADMAP.md.
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

function scoreSafety(ingredients: ProductIngredientRow[]): { score: number; breakdown: SafetyBreakdown } {
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
  const score = Math.max(0, 100 - interactions.length * 20);
  return { score, breakdown: { interactions, warningCount: interactions.length } };
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

export function scoreProduct(input: {
  product: ProductRow;
  ingredients: ProductIngredientRow[];
  certifications: CertificationRow[];
  manufacturer: ManufacturerRow | null;
}): ProductScore {
  const evidence = scoreEvidence(input.ingredients);
  const safety = scoreSafety(input.ingredients);
  const formulation = scoreFormulation(input.ingredients);
  const manufacturing = scoreManufacturing(input.manufacturer);
  const transparency = scoreTransparency(input.ingredients, input.certifications);
  const sustainability = 60; // placeholder until we wire sustainability signals

  const weighted =
    evidence.score * WEIGHTS.evidence +
    safety.score * WEIGHTS.safety +
    formulation.score * WEIGHTS.formulation +
    manufacturing.score * WEIGHTS.manufacturing +
    transparency.score * WEIGHTS.transparency +
    sustainability * WEIGHTS.sustainability;

  const bonus = certificationBonus(input.certifications);
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
}
