// Protocol Templates — Canonical supplement protocols for common health goals
// These match the seeded data in the `protocols` table
// Can be used client-side for display or as fallback if DB is unavailable

export interface ProtocolIngredient {
  name: string;
  dose_mg: number;
  unit: string;
  timing: string;
  rationale: string;
}

export interface ProtocolTemplate {
  id?: string;
  slug: string;
  name: string;
  description: string;
  tier: "foundation" | "optimization" | "therapeutic";
  goals: string[];
  ingredients: ProtocolIngredient[];
  expectedBenefits: string[];
  timeline: string;
  contraindications: string[];
  monitoringAdvice: string;
  evidenceSummary: string;
  evidenceTier: "strong" | "moderate" | "weak";
  isPublic?: boolean;
}

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  // ══════════════════════════════════════════════════════════════
  // COGNITIVE PERFORMANCE & FOCUS
  // ══════════════════════════════════════════════════════════════
  {
    slug: "cognitive-performance-v1",
    name: "Cognitive Performance & Focus",
    description:
      "Evidence-based stack for sustained focus, memory, and mental clarity without overstimulation.",
    tier: "optimization",
    goals: ["focus", "energy"],
    ingredients: [
      {
        name: "Caffeine",
        dose_mg: 100,
        unit: "mg",
        timing: "morning",
        rationale: "Adenosine antagonist for alertness and focus",
      },
      {
        name: "L-Theanine",
        dose_mg: 200,
        unit: "mg",
        timing: "morning",
        rationale: "Smooths caffeine stimulation, promotes calm focus",
      },
      {
        name: "Bacopa Monnieri",
        dose_mg: 300,
        unit: "mg",
        timing: "morning",
        rationale: "Memory enhancement, requires 8-12 weeks",
      },
      {
        name: "Lion's Mane",
        dose_mg: 1000,
        unit: "mg",
        timing: "morning",
        rationale: "Neuroprotection and NGF support",
      },
      {
        name: "CDP-Choline",
        dose_mg: 250,
        unit: "mg",
        timing: "morning",
        rationale: "Choline source for acetylcholine synthesis",
      },
      {
        name: "Vitamin B12",
        dose_mg: 1,
        unit: "mg",
        timing: "morning",
        rationale: "Energy metabolism and cognitive function",
      },
    ],
    expectedBenefits: [
      "Improved focus and mental clarity",
      "Enhanced working memory",
      "Reduced mental fatigue",
      "Smooth sustained energy",
    ],
    timeline:
      "2-4 weeks for noticeable cognitive benefits; Bacopa requires 8-12 weeks for memory effects",
    contraindications: [
      "Avoid if sensitive to caffeine",
      "Consult physician if on blood thinners (bacopa)",
    ],
    monitoringAdvice:
      "Track focus quality, mental fatigue, and sleep quality. Adjust caffeine dose based on tolerance.",
    evidenceSummary:
      "Caffeine + L-theanine combination is well-studied (PMID: 18681988). Bacopa improves memory in RCTs (PMID: 23788517). Lion's mane shows promise for neuroprotection (PMID: 25385080).",
    evidenceTier: "strong",
    isPublic: true,
  },

  // ══════════════════════════════════════════════════════════════
  // DEEP SLEEP & RECOVERY
  // ══════════════════════════════════════════════════════════════
  {
    slug: "deep-sleep-recovery-v1",
    name: "Deep Sleep & Recovery",
    description:
      "Comprehensive stack for sleep quality, duration, and next-day recovery without grogginess.",
    tier: "foundation",
    goals: ["sleep", "recovery"],
    ingredients: [
      {
        name: "Magnesium Glycinate",
        dose_mg: 400,
        unit: "mg",
        timing: "evening",
        rationale: "GABA-A modulation, best-tolerated form",
      },
      {
        name: "Glycine",
        dose_mg: 3000,
        unit: "mg",
        timing: "evening",
        rationale: "Core body temperature reduction for sleep onset",
      },
      {
        name: "L-Theanine",
        dose_mg: 200,
        unit: "mg",
        timing: "evening",
        rationale: "Relaxation without sedation",
      },
      {
        name: "Apigenin",
        dose_mg: 50,
        unit: "mg",
        timing: "evening",
        rationale: "Chamomile flavonoid, mild anxiolytic",
      },
      {
        name: "Melatonin",
        dose_mg: 0.5,
        unit: "mg",
        timing: "evening",
        rationale: "Low-dose for circadian rhythm (not sedation)",
      },
    ],
    expectedBenefits: [
      "Faster sleep onset",
      "Deeper sleep stages",
      "Improved next-day energy",
      "No morning grogginess",
    ],
    timeline: "1-2 weeks for consistent sleep quality improvement",
    contraindications: [
      "Melatonin not for children/pregnant women",
      "Consult physician if on sleep medications",
    ],
    monitoringAdvice:
      "Track sleep latency, wake-ups, and morning alertness. Consider sleep tracker (Oura, Whoop) for objective data.",
    evidenceSummary:
      "Magnesium improves sleep quality (PMID: 33858506). Glycine reduces sleep onset latency (PMID: 22293292). Low-dose melatonin (0.3-1mg) is effective (PMID: 23691216).",
    evidenceTier: "strong",
    isPublic: true,
  },

  // ══════════════════════════════════════════════════════════════
  // ATHLETIC PERFORMANCE & STRENGTH
  // ══════════════════════════════════════════════════════════════
  {
    slug: "athletic-performance-v1",
    name: "Athletic Performance & Strength",
    description:
      "Evidence-based stack for strength, power output, and endurance in trained athletes.",
    tier: "optimization",
    goals: ["muscle", "energy", "recovery"],
    ingredients: [
      {
        name: "Creatine Monohydrate",
        dose_mg: 5000,
        unit: "mg",
        timing: "any",
        rationale: "Most researched supplement for strength and power",
      },
      {
        name: "Beta-Alanine",
        dose_mg: 3200,
        unit: "mg",
        timing: "pre-workout",
        rationale: "Buffering for 1-4 min high-intensity efforts",
      },
      {
        name: "Citrulline",
        dose_mg: 6000,
        unit: "mg",
        timing: "pre-workout",
        rationale: "Nitric oxide precursor for blood flow",
      },
      {
        name: "Betaine",
        dose_mg: 2500,
        unit: "mg",
        timing: "pre-workout",
        rationale: "Power output and body composition",
      },
      {
        name: "Vitamin D3",
        dose_mg: 125,
        unit: "mcg",
        timing: "morning",
        rationale: "Muscle function and testosterone support",
      },
      {
        name: "Magnesium Glycinate",
        dose_mg: 400,
        unit: "mg",
        timing: "evening",
        rationale: "Muscle function and recovery",
      },
    ],
    expectedBenefits: [
      "Increased strength and power output",
      "Improved muscular endurance",
      "Faster recovery between sets",
      "Enhanced training volume",
    ],
    timeline:
      "Creatine: 2-4 weeks for saturation; Beta-alanine: 2-4 weeks; Others: acute effects",
    contraindications: ["Beta-alanine causes harmless tingling (paresthesia)"],
    monitoringAdvice:
      "Track strength PRs, training volume, and recovery quality. Ensure adequate protein intake (1.6-2.2 g/kg).",
    evidenceSummary:
      "Creatine increases lean mass and strength (PMID: 28615996). Beta-alanine improves high-intensity exercise (PMID: 25277852). Citrulline enhances resistance training performance (PMID: 26900386).",
    evidenceTier: "strong",
    isPublic: true,
  },

  // ══════════════════════════════════════════════════════════════
  // LONGEVITY FOUNDATION
  // ══════════════════════════════════════════════════════════════
  {
    slug: "longevity-foundation-v1",
    name: "Longevity Foundation",
    description:
      "Foundational stack targeting cellular health, NAD+ pathways, inflammation, and healthy aging.",
    tier: "foundation",
    goals: ["longevity", "inflammation"],
    ingredients: [
      {
        name: "NMN",
        dose_mg: 500,
        unit: "mg",
        timing: "morning",
        rationale: "NAD+ precursor for cellular energy and DNA repair",
      },
      {
        name: "Resveratrol",
        dose_mg: 500,
        unit: "mg",
        timing: "morning",
        rationale: "Sirtuin activator, synergy with NMN",
      },
      {
        name: "Fish Oil",
        dose_mg: 2000,
        unit: "mg",
        timing: "with-food",
        rationale: "EPA/DHA for inflammation and cardiovascular health",
      },
      {
        name: "Vitamin D3",
        dose_mg: 125,
        unit: "mcg",
        timing: "morning",
        rationale: "Immune, bone, and longevity pathways",
      },
      {
        name: "Vitamin K2",
        dose_mg: 100,
        unit: "mcg",
        timing: "morning",
        rationale: "Directs calcium to bones, pairs with D3",
      },
      {
        name: "Magnesium Glycinate",
        dose_mg: 400,
        unit: "mg",
        timing: "evening",
        rationale: "Required for 300+ enzymes, D3 activation",
      },
      {
        name: "CoQ10",
        dose_mg: 200,
        unit: "mg",
        timing: "morning",
        rationale: "Mitochondrial function and antioxidant",
      },
    ],
    expectedBenefits: [
      "Cellular energy optimization",
      "Reduced systemic inflammation",
      "Cardiovascular support",
      "Healthy aging markers",
    ],
    timeline: "Ongoing — benefits accumulate over months to years",
    contraindications: [
      "Fish oil may increase bleeding risk at very high doses",
      "Vitamin K2 contraindicated with warfarin",
    ],
    monitoringAdvice:
      "Consider annual biomarkers: hsCRP, lipid panel, vitamin D levels, HbA1c. Track subjective energy and recovery.",
    evidenceSummary:
      "NMN raises NAD+ in humans (PMID: 33888596). Fish oil reduces cardiovascular events (PMID: 30415637). Vitamin D3 associated with longevity (PMID: 24523492).",
    evidenceTier: "moderate",
    isPublic: true,
  },

  // ══════════════════════════════════════════════════════════════
  // IMMUNE SUPPORT & DEFENSE
  // ══════════════════════════════════════════════════════════════
  {
    slug: "immune-support-v1",
    name: "Immune Support & Defense",
    description:
      "Comprehensive immune optimization stack for daily defense and acute support during illness.",
    tier: "optimization",
    goals: ["inflammation", "longevity"],
    ingredients: [
      {
        name: "Vitamin D3",
        dose_mg: 125,
        unit: "mcg",
        timing: "morning",
        rationale: "Critical for innate and adaptive immunity",
      },
      {
        name: "Vitamin C",
        dose_mg: 1000,
        unit: "mg",
        timing: "morning",
        rationale: "Immune cell function and antioxidant",
      },
      {
        name: "Zinc",
        dose_mg: 30,
        unit: "mg",
        timing: "evening",
        rationale: "Immune signaling and barrier function",
      },
      {
        name: "Quercetin",
        dose_mg: 500,
        unit: "mg",
        timing: "morning",
        rationale: "Zinc ionophore, anti-inflammatory flavonoid",
      },
      {
        name: "NAC",
        dose_mg: 600,
        unit: "mg",
        timing: "morning",
        rationale: "Glutathione precursor, mucolytic",
      },
      {
        name: "Probiotics",
        dose_mg: 10000000000,
        unit: "CFU",
        timing: "morning",
        rationale: "Gut-immune axis support",
      },
    ],
    expectedBenefits: [
      "Enhanced immune resilience",
      "Reduced infection frequency",
      "Faster recovery from illness",
      "Gut health optimization",
    ],
    timeline:
      "2-4 weeks for baseline immune enhancement; acute dosing during illness",
    contraindications: [
      "High zinc (>40mg long-term) can deplete copper",
      "NAC may interact with nitroglycerin",
    ],
    monitoringAdvice:
      "Track illness frequency and duration. Consider reducing zinc to 15mg long-term after acute phase.",
    evidenceSummary:
      "Vitamin D reduces respiratory infections (PMID: 28202713). Zinc shortens cold duration (PMID: 28515951). NAC reduces influenza symptoms (PMID: 9230243).",
    evidenceTier: "moderate",
    isPublic: true,
  },
];

/**
 * Get a protocol template by slug
 */
export function getProtocolBySlug(slug: string): ProtocolTemplate | null {
  return PROTOCOL_TEMPLATES.find((p) => p.slug === slug) || null;
}

/**
 * Get protocol templates by goal
 */
export function getProtocolsByGoal(goal: string): ProtocolTemplate[] {
  return PROTOCOL_TEMPLATES.filter((p) => p.goals.includes(goal));
}

/**
 * Get all public protocol templates
 */
export function getPublicProtocols(): ProtocolTemplate[] {
  return PROTOCOL_TEMPLATES.filter((p) => p.isPublic !== false);
}
