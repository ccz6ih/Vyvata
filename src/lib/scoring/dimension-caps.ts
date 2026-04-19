// Dimension scoring caps — how much of each dimension's weight can be
// awarded from public data alone, and how much requires brand submission.
//
// Core rule: if a score component cannot be derived deterministically from a
// public source, it belongs in intakeBonus. Missing intake data scores zero —
// never assume in the brand's favor.
//
// These numbers are the calibration layer. The plan in
// docs/UI-V2-AND-SUBMISSION-PLAN.md §1.2 calls for tuning them in PR review,
// not in the first pass. Current values are honest ceilings based on what
// each listed public source can actually produce today.

export type DimensionId =
  | "evidence"
  | "safety"
  | "formulation"
  | "manufacturing"
  | "transparency"
  | "sustainability";

export interface DimensionCap {
  id: DimensionId;
  label: string;
  icon: string;
  weight: number;          // full points in Verified mode (sums to 100)
  publicMax: number;       // max achievable from public data alone
  intakeBonus: number;     // weight - publicMax, unlocked by brand submission
  tooltip: string;
  publicSources: string[];
  intakeSources: string[];
}

export const DIMENSION_CAPS: Record<DimensionId, DimensionCap> = {
  evidence: {
    id: "evidence",
    label: "Evidence Quality",
    icon: "microscope",
    weight: 25,
    // PubMed / Cochrane are public and comprehensive. Evidence grade is
    // fully derivable from the literature without brand participation.
    publicMax: 25,
    intakeBonus: 0,
    tooltip: "Strength of clinical evidence for the product's primary claims.",
    publicSources: ["PubMed RCT lookup", "NCBI meta-analyses", "Cochrane reviews"],
    intakeSources: ["Product-specific RCTs commissioned by brand"],
  },
  safety: {
    id: "safety",
    label: "Safety Profile",
    icon: "shield",
    weight: 15,
    // FDA CAERS, MedWatch, and recall databases are comprehensive enough to
    // award full credit from public data when a product comes up clean.
    publicMax: 15,
    intakeBonus: 0,
    tooltip: "Adverse event history, drug interactions, and risk communication.",
    publicSources: ["FDA CAERS", "openFDA recalls", "FDA import alerts", "FDA warning letters"],
    intakeSources: ["Internal AE tracking", "Contraindication documentation"],
  },
  formulation: {
    id: "formulation",
    label: "Formulation Integrity",
    icon: "beaker",
    weight: 20,
    // NIH DSLD gives label-level ingredient/dose/form. But bioavailability
    // form nuance, synergy rationale, and proprietary blend exposure require
    // brand submission to fully award.
    publicMax: 12,
    intakeBonus: 8,
    tooltip: "Clinically effective dosing in bioavailable forms with no hidden blends.",
    publicSources: ["NIH DSLD", "Label OCR parse", "Proprietary blend detection"],
    intakeSources: ["Full formula breakdown", "Bioavailability notes", "Synergy rationale"],
  },
  manufacturing: {
    id: "manufacturing",
    label: "Manufacturing & Purity",
    icon: "factory",
    weight: 20,
    // NSF / USP / Informed Sport registries cover the meaningful public
    // signals. Remaining 4 points require batch-level CoA + facility audit.
    publicMax: 16,
    intakeBonus: 4,
    tooltip: "GMP compliance, third-party certification, and contamination testing.",
    publicSources: ["NSF registry", "USP Verified registry", "Informed Sport registry"],
    intakeSources: ["Batch-level CoA", "Facility audit reports", "In-house QC data"],
  },
  transparency: {
    id: "transparency",
    label: "Brand Transparency",
    icon: "eye",
    weight: 12,
    // Public claim crawlers + CoA accessibility check what a brand publishes.
    // Deeper sourcing disclosures and endorsement transparency need brand input.
    publicMax: 7,
    intakeBonus: 5,
    tooltip: "Honest claims, accessible testing data, and no hidden promotions.",
    publicSources: ["Website claim crawler", "Public CoA accessibility", "Marketing claim NLP"],
    intakeSources: ["Sourcing documentation", "Endorsement disclosures", "Clinical affiliate audit"],
  },
  sustainability: {
    id: "sustainability",
    label: "Sustainability & Ethics",
    icon: "leaf",
    weight: 8,
    // B-Corp status and public ethics claims are checkable. Supply-chain
    // documentation and third-party ethics audits require brand submission.
    publicMax: 4,
    intakeBonus: 4,
    tooltip: "Responsible sourcing, packaging, and ethical manufacturing practices.",
    publicSources: ["B-Corp registry", "Website ethics claims"],
    intakeSources: ["Supply chain documentation", "Third-party ethics audits"],
  },
};

export const DIMENSION_IDS: DimensionId[] = [
  "evidence",
  "safety",
  "formulation",
  "manufacturing",
  "transparency",
  "sustainability",
];

// Aggregate ceilings. AI_INFERRED_MAX is the honest cap — a product scoring
// maximally from public data alone can still only reach this number until
// the brand submits. VERIFIED_MAX is 100 by construction.
export const AI_INFERRED_MAX = DIMENSION_IDS.reduce(
  (sum, id) => sum + DIMENSION_CAPS[id].publicMax,
  0
);
export const VERIFIED_MAX = DIMENSION_IDS.reduce(
  (sum, id) => sum + DIMENSION_CAPS[id].weight,
  0
);
export const TOTAL_INTAKE_BONUS = VERIFIED_MAX - AI_INFERRED_MAX;

export type ScoreMode = "ai_inferred" | "verified";

/**
 * How much weighted contribution a dimension can make in a given mode.
 * AI-inferred mode caps at `publicMax`; verified mode gets the full `weight`.
 * This is the sole knob that differentiates the two modes — the raw 0-100
 * dimension score is the same; only its effective weight changes.
 */
export function modeWeight(id: DimensionId, mode: ScoreMode): number {
  const cap = DIMENSION_CAPS[id];
  return mode === "verified" ? cap.weight : cap.publicMax;
}
