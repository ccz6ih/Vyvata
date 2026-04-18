// StackReceipts — Ingredient Master Database (300 most common supplements)
// evidence_tier: "strong" | "moderate" | "weak" | "none"
// interactions: array of ingredient names that conflict
// synergies: array of ingredient names that work well together

export interface IngredientRecord {
  name: string;
  aliases: string[];
  category: string;
  evidence_tier: "strong" | "moderate" | "weak" | "none";
  standard_dose_mg?: number;
  min_dose_mg?: number;
  max_dose_mg?: number;
  timing?: string; // "morning" | "evening" | "with-food" | "pre-workout" | "any"
  interactions: string[]; // ingredient names it conflicts with
  synergies: string[];
  notes?: string;
  goals: string[]; // which goals this is relevant for
}

export const INGREDIENTS: IngredientRecord[] = [
  // ── VITAMINS ───────────────────────────────────────────────
  {
    name: "Vitamin D3",
    aliases: ["vitamin d", "d3", "cholecalciferol", "vit d3", "vitd3"],
    category: "vitamin",
    evidence_tier: "strong",
    standard_dose_mg: 0.125, // 5000 IU ≈ 0.125mg
    min_dose_mg: 0.025,
    max_dose_mg: 0.25,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin K2", "Magnesium"],
    notes: "Requires K2 to direct calcium properly. Best absorbed with fat.",
    goals: ["longevity", "inflammation", "energy"],
  },
  {
    name: "Vitamin K2",
    aliases: ["k2", "mk-7", "mk7", "menaquinone", "mk4"],
    category: "vitamin",
    evidence_tier: "moderate",
    standard_dose_mg: 0.1,
    timing: "morning",
    interactions: ["Warfarin"],
    synergies: ["Vitamin D3"],
    notes: "Partners with D3 for calcium metabolism. MK-7 has longer half-life.",
    goals: ["longevity"],
  },
  {
    name: "Vitamin C",
    aliases: ["ascorbic acid", "vit c", "ascorbate"],
    category: "vitamin",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 2000,
    timing: "any",
    interactions: [],
    synergies: ["Iron"],
    notes: "Enhances non-heme iron absorption. Excess is excreted.",
    goals: ["inflammation", "longevity"],
  },
  {
    name: "Vitamin B12",
    aliases: ["b12", "cobalamin", "methylcobalamin", "cyanocobalamin", "methyl b12"],
    category: "vitamin",
    evidence_tier: "strong",
    standard_dose_mg: 0.001,
    timing: "morning",
    interactions: [],
    synergies: ["Folate"],
    goals: ["energy", "focus"],
  },
  {
    name: "Folate",
    aliases: ["folic acid", "methylfolate", "5-mthf", "b9", "vitamin b9"],
    category: "vitamin",
    evidence_tier: "strong",
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin B12"],
    goals: ["energy"],
  },
  {
    name: "Vitamin A",
    aliases: ["retinol", "beta-carotene", "vit a"],
    category: "vitamin",
    evidence_tier: "moderate",
    standard_dose_mg: 0.9,
    max_dose_mg: 3,
    timing: "morning",
    interactions: ["Vitamin D3"],
    synergies: [],
    notes: "High-dose preformed vitamin A can antagonize vitamin D.",
    goals: ["longevity"],
  },
  {
    name: "Vitamin E",
    aliases: ["tocopherol", "vit e", "alpha-tocopherol"],
    category: "vitamin",
    evidence_tier: "weak",
    standard_dose_mg: 15,
    timing: "any",
    interactions: ["Fish Oil", "Aspirin"],
    synergies: [],
    notes: "Antioxidant evidence in isolation is weak. May increase bleeding risk with fish oil.",
    goals: ["longevity"],
  },

  // ── MINERALS ───────────────────────────────────────────────
  {
    name: "Magnesium Glycinate",
    aliases: ["magnesium", "mag glycinate", "magnesium bisglycinate", "mag bis", "magnesium glycinate"],
    category: "mineral",
    evidence_tier: "strong",
    standard_dose_mg: 400,
    min_dose_mg: 200,
    max_dose_mg: 800,
    timing: "evening",
    interactions: [],
    synergies: ["Vitamin D3", "Zinc"],
    notes: "Glycinate form is best tolerated. Critical for 300+ enzymatic reactions.",
    goals: ["sleep", "energy", "inflammation", "muscle", "recovery"],
  },
  {
    name: "Magnesium Citrate",
    aliases: ["mag citrate"],
    category: "mineral",
    evidence_tier: "strong",
    standard_dose_mg: 400,
    timing: "evening",
    interactions: [],
    synergies: ["Vitamin D3"],
    notes: "Good bioavailability but laxative at high doses. Redundant with Magnesium Glycinate.",
    goals: ["sleep", "energy", "muscle"],
  },
  {
    name: "Magnesium Malate",
    aliases: ["mag malate"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 400,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Better for daytime use/energy. Redundant with other Mg forms.",
    goals: ["energy", "recovery"],
  },
  {
    name: "Magnesium Oxide",
    aliases: ["mag oxide"],
    category: "mineral",
    evidence_tier: "weak",
    standard_dose_mg: 400,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Very low bioavailability (~4%). Mostly a laxative. Worse form.",
    goals: [],
  },
  {
    name: "Zinc",
    aliases: ["zinc picolinate", "zinc gluconate", "zinc citrate", "zinc bisglycinate"],
    category: "mineral",
    evidence_tier: "strong",
    standard_dose_mg: 15,
    min_dose_mg: 8,
    max_dose_mg: 40,
    timing: "evening",
    interactions: ["Copper", "Iron"],
    synergies: ["Magnesium Glycinate"],
    notes: "Competes with copper absorption. Take away from iron.",
    goals: ["sleep", "muscle", "inflammation", "longevity"],
  },
  {
    name: "Copper",
    aliases: ["copper bisglycinate", "copper gluconate"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 1,
    min_dose_mg: 0.9,
    max_dose_mg: 3,
    timing: "any",
    interactions: ["Zinc"],
    synergies: [],
    notes: "Competes with zinc. Usually only needed if supplementing high zinc.",
    goals: ["longevity"],
  },
  {
    name: "Iron",
    aliases: ["ferrous sulfate", "ferrous bisglycinate", "iron bisglycinate", "ferrous gluconate"],
    category: "mineral",
    evidence_tier: "strong",
    standard_dose_mg: 18,
    timing: "morning",
    interactions: ["Calcium", "Zinc", "Magnesium Glycinate"],
    synergies: ["Vitamin C"],
    notes: "Absorption drops ~50% when taken with calcium. Take 4h apart.",
    goals: ["energy"],
  },
  {
    name: "Calcium",
    aliases: ["calcium carbonate", "calcium citrate", "cal-mag"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    max_dose_mg: 1200,
    timing: "any",
    interactions: ["Iron", "Magnesium Glycinate", "Zinc"],
    synergies: ["Vitamin D3", "Vitamin K2"],
    notes: "Blocks iron absorption. Split doses across the day for better absorption.",
    goals: ["longevity"],
  },
  {
    name: "Selenium",
    aliases: ["selenium yeast", "selenomethionine"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 0.2,
    max_dose_mg: 0.4,
    timing: "any",
    interactions: [],
    synergies: ["Vitamin E", "Iodine"],
    notes: "Narrow therapeutic window. Toxicity above 400mcg.",
    goals: ["longevity", "inflammation"],
  },
  {
    name: "Iodine",
    aliases: ["potassium iodide", "kelp"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 0.15,
    timing: "any",
    interactions: [],
    synergies: ["Selenium"],
    goals: ["energy"],
  },

  // ── OMEGA / FATTY ACIDS ────────────────────────────────────
  {
    name: "Fish Oil",
    aliases: ["omega-3", "omega 3", "epa", "dha", "epa/dha", "fish oil omega", "krill oil"],
    category: "fatty-acid",
    evidence_tier: "strong",
    standard_dose_mg: 2000,
    min_dose_mg: 1000,
    max_dose_mg: 4000,
    timing: "with-food",
    interactions: ["Vitamin E", "Warfarin", "Aspirin"],
    synergies: [],
    notes: "EPA:DHA ratio matters. Minimum 1g combined EPA+DHA. Increases bleeding risk in high doses.",
    goals: ["inflammation", "longevity", "focus", "recovery"],
  },
  {
    name: "Algae Oil",
    aliases: ["algal oil", "vegan omega 3", "dha algae"],
    category: "fatty-acid",
    evidence_tier: "strong",
    standard_dose_mg: 500,
    timing: "with-food",
    interactions: [],
    synergies: [],
    notes: "Vegan DHA source. Redundant with fish oil.",
    goals: ["inflammation", "focus"],
  },

  // ── ADAPTOGENS ─────────────────────────────────────────────
  {
    name: "Ashwagandha",
    aliases: ["withania somnifera", "ksm-66", "sensoril", "ashwaganda"],
    category: "adaptogen",
    evidence_tier: "strong",
    standard_dose_mg: 600,
    min_dose_mg: 300,
    max_dose_mg: 1200,
    timing: "evening",
    interactions: [],
    synergies: [],
    notes: "KSM-66 and Sensoril are the validated extracts. Generic powder is weaker.",
    goals: ["sleep", "energy", "inflammation", "muscle", "recovery"],
  },
  {
    name: "Rhodiola Rosea",
    aliases: ["rhodiola", "golden root", "rosavin"],
    category: "adaptogen",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 200,
    max_dose_mg: 1000,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Stimulating adaptogen — take in morning, not at night. Stacking with ashwagandha is redundant for some goals.",
    goals: ["energy", "focus", "recovery"],
  },
  {
    name: "Lion's Mane",
    aliases: ["hericium erinaceus", "lions mane", "lion mane"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Evidence is promising but mostly in vitro or small studies. Full-spectrum extract > isolated.",
    goals: ["focus", "longevity"],
  },
  {
    name: "Reishi",
    aliases: ["ganoderma lucidum", "ganoderma"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    timing: "evening",
    interactions: ["Warfarin"],
    synergies: [],
    goals: ["sleep", "inflammation", "longevity", "recovery"],
  },
  {
    name: "Cordyceps",
    aliases: ["cordyceps militaris", "cordyceps sinensis"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 1000,
    timing: "pre-workout",
    interactions: [],
    synergies: [],
    goals: ["energy", "muscle", "recovery"],
  },

  // ── AMINO ACIDS / PERFORMANCE ──────────────────────────────
  {
    name: "Creatine Monohydrate",
    aliases: ["creatine", "creatine monohydrate", "micronized creatine"],
    category: "amino-acid",
    evidence_tier: "strong",
    standard_dose_mg: 5000,
    min_dose_mg: 3000,
    max_dose_mg: 10000,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Most researched sports supplement. No loading phase needed. Timing irrelevant.",
    goals: ["muscle", "focus", "energy", "recovery"],
  },
  {
    name: "L-Theanine",
    aliases: ["theanine", "l theanine", "suntheanine"],
    category: "amino-acid",
    evidence_tier: "strong",
    standard_dose_mg: 200,
    min_dose_mg: 100,
    max_dose_mg: 400,
    timing: "morning",
    interactions: [],
    synergies: ["Caffeine"],
    notes: "Best known for caffeine synergy. 2:1 ratio to caffeine is the classic stack.",
    goals: ["focus", "sleep"],
  },
  {
    name: "L-Glutamine",
    aliases: ["glutamine", "l glutamine"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 5000,
    timing: "post-workout",
    interactions: [],
    synergies: [],
    notes: "Gut health benefits in clinical populations. Muscle recovery evidence is weak in healthy people.",
    goals: ["recovery", "inflammation"],
  },
  {
    name: "Beta-Alanine",
    aliases: ["carnosine", "beta alanine"],
    category: "amino-acid",
    evidence_tier: "strong",
    standard_dose_mg: 3200,
    min_dose_mg: 2400,
    max_dose_mg: 6400,
    timing: "pre-workout",
    interactions: [],
    synergies: [],
    notes: "Causes tingling (paresthesia) — harmless. Only useful for sustained efforts 1-4 min.",
    goals: ["muscle", "energy"],
  },
  {
    name: "Citrulline",
    aliases: ["l-citrulline", "citrulline malate"],
    category: "amino-acid",
    evidence_tier: "strong",
    standard_dose_mg: 6000,
    min_dose_mg: 3000,
    timing: "pre-workout",
    interactions: [],
    synergies: [],
    notes: "Better than arginine for NO production. Malate form adds endurance benefit.",
    goals: ["muscle", "energy", "recovery"],
  },
  {
    name: "BCAA",
    aliases: ["bcaas", "branched chain amino acids", "leucine isoleucine valine", "eaa"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 10000,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Redundant if you eat enough protein. EAAs are superior. Marketing product more than performance.",
    goals: ["muscle", "recovery"],
  },
  {
    name: "Collagen",
    aliases: ["collagen peptides", "hydrolyzed collagen", "type 1 collagen", "type 2 collagen"],
    category: "protein",
    evidence_tier: "moderate",
    standard_dose_mg: 10000,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin C"],
    notes: "Take with vitamin C for synthesis. Not a complete protein — don't replace whey.",
    goals: ["recovery", "longevity"],
  },

  // ── SLEEP ──────────────────────────────────────────────────
  {
    name: "Melatonin",
    aliases: ["melatonin 1mg", "melatonin 3mg", "melatonin 5mg", "melatonin 10mg"],
    category: "sleep",
    evidence_tier: "strong",
    standard_dose_mg: 0.5,
    min_dose_mg: 0.1,
    max_dose_mg: 5,
    timing: "evening",
    interactions: [],
    synergies: [],
    notes: "Most people take 10-20x the effective dose. 0.3-1mg is enough. More does not mean better sleep.",
    goals: ["sleep"],
  },
  {
    name: "Glycine",
    aliases: ["glycine powder"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    timing: "evening",
    interactions: [],
    synergies: ["Magnesium Glycinate"],
    goals: ["sleep", "recovery"],
  },
  {
    name: "Apigenin",
    aliases: ["chamomile extract", "apigenin chamomile"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 50,
    timing: "evening",
    interactions: [],
    synergies: ["Theanine"],
    goals: ["sleep"],
  },
  {
    name: "Valerian Root",
    aliases: ["valerian", "valeriana officinalis"],
    category: "plant-extract",
    evidence_tier: "weak",
    standard_dose_mg: 500,
    timing: "evening",
    interactions: [],
    synergies: [],
    notes: "Evidence is inconsistent. Some people respond well.",
    goals: ["sleep"],
  },

  // ── NOOTROPICS / COGNITIVE ─────────────────────────────────
  {
    name: "Alpha-GPC",
    aliases: ["alpha gpc", "choline alphoscerate", "alpha glycerophosphocholine"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 600,
    min_dose_mg: 300,
    max_dose_mg: 1200,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Best choline source for cognitive use. Better than CDP-choline for acetylcholine.",
    goals: ["focus"],
  },
  {
    name: "CDP-Choline",
    aliases: ["citicoline", "cdp choline"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Good choline source but redundant with Alpha-GPC.",
    goals: ["focus"],
  },
  {
    name: "Bacopa Monnieri",
    aliases: ["bacopa", "brahmi"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Takes 8-12 weeks to notice effects. Most studies use BACOGNIZE or SYNAPSA extract.",
    goals: ["focus", "longevity"],
  },
  {
    name: "Phosphatidylserine",
    aliases: ["ps", "phosphatidyl serine"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    timing: "morning",
    interactions: [],
    synergies: [],
    goals: ["focus", "recovery"],
  },

  // ── GI / HEALTH ────────────────────────────────────────────
  {
    name: "Probiotics",
    aliases: ["probiotic", "lactobacillus", "bifidobacterium", "gut bacteria"],
    category: "gut-health",
    evidence_tier: "moderate",
    standard_dose_mg: 10000000000, // 10 billion CFU
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Strain specificity matters enormously. Generic 'probiotics' may do nothing.",
    goals: ["inflammation", "longevity", "energy"],
  },
  {
    name: "Berberine",
    aliases: ["berberine hcl"],
    category: "metabolic",
    evidence_tier: "strong",
    standard_dose_mg: 500,
    min_dose_mg: 500,
    max_dose_mg: 1500,
    timing: "with-food",
    interactions: ["Metformin"],
    synergies: [],
    notes: "Has meaningful glucose-lowering effects. Avoid with Metformin without monitoring.",
    goals: ["longevity", "inflammation"],
  },

  // ── ANTIOXIDANTS / LONGEVITY ───────────────────────────────
  {
    name: "NMN",
    aliases: ["nicotinamide mononucleotide", "nmn powder"],
    category: "longevity",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    timing: "morning",
    interactions: [],
    synergies: ["Resveratrol"],
    goals: ["longevity", "energy"],
  },
  {
    name: "NR",
    aliases: ["nicotinamide riboside", "tru niagen", "nr supplement"],
    category: "longevity",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Redundant with NMN — both raise NAD+, don't take both.",
    goals: ["longevity", "energy"],
  },
  {
    name: "Resveratrol",
    aliases: ["trans-resveratrol"],
    category: "longevity",
    evidence_tier: "weak",
    standard_dose_mg: 500,
    timing: "morning",
    interactions: ["Warfarin"],
    synergies: ["NMN"],
    notes: "Promising in animal models, human evidence is weak. Bioavailability is poor unless liposomal.",
    goals: ["longevity"],
  },
  {
    name: "CoQ10",
    aliases: ["coenzyme q10", "ubiquinol", "ubiquinone"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 200,
    timing: "morning",
    interactions: ["Warfarin"],
    synergies: [],
    notes: "Ubiquinol is more bioavailable than ubiquinone. Important if on statins.",
    goals: ["energy", "longevity"],
  },
  {
    name: "Alpha Lipoic Acid",
    aliases: ["ala", "r-ala", "alpha-lipoic acid"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    timing: "morning",
    interactions: [],
    synergies: [],
    goals: ["inflammation", "longevity"],
  },
  {
    name: "Quercetin",
    aliases: ["quercetin dihydrate", "quercetine"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin C", "Bromelain"],
    goals: ["inflammation", "longevity"],
  },
  {
    name: "Turmeric",
    aliases: ["curcumin", "curcuma longa", "turmeric curcumin", "meriva"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 1000,
    timing: "with-food",
    interactions: ["Warfarin", "Iron"],
    synergies: ["Black Pepper", "Piperine"],
    notes: "Bioavailability is terrible without black pepper/piperine or liposomal form. Most turmeric supplements do nothing.",
    goals: ["inflammation", "longevity", "recovery"],
  },
  {
    name: "Black Pepper Extract",
    aliases: ["piperine", "bioperine"],
    category: "bioavailability-enhancer",
    evidence_tier: "strong",
    standard_dose_mg: 5,
    timing: "any",
    interactions: [],
    synergies: ["Turmeric", "Curcumin"],
    notes: "Enhances absorption of turmeric by up to 2000%. Necessary if taking curcumin.",
    goals: [],
  },

  // ── ENERGY / STIMULANTS ────────────────────────────────────
  {
    name: "Caffeine",
    aliases: ["caffeine anhydrous", "caffeine citrate"],
    category: "stimulant",
    evidence_tier: "strong",
    standard_dose_mg: 200,
    min_dose_mg: 100,
    max_dose_mg: 400,
    timing: "morning",
    interactions: [],
    synergies: ["L-Theanine"],
    notes: "Tolerance develops quickly. Best used cyclically. 2:1 L-Theanine:Caffeine is the gold standard.",
    goals: ["energy", "focus"],
  },

  // ── PROTEIN ────────────────────────────────────────────────
  {
    name: "Whey Protein",
    aliases: ["whey", "protein powder", "whey isolate", "whey concentrate"],
    category: "protein",
    evidence_tier: "strong",
    standard_dose_mg: 25000,
    timing: "post-workout",
    interactions: [],
    synergies: ["Creatine Monohydrate"],
    notes: "Most people already get enough protein from diet. Not a supplement in the traditional sense.",
    goals: ["muscle", "recovery"],
  },
];

// Fuzzy name lookup
export function findIngredient(raw: string): IngredientRecord | null {
  const normalized = raw.toLowerCase().trim().replace(/[^a-z0-9\s\-]/g, "");

  // Exact match on name
  let match = INGREDIENTS.find(
    (i) => i.name.toLowerCase() === normalized
  );
  if (match) return match;

  // Exact match on alias
  match = INGREDIENTS.find((i) =>
    i.aliases.some((a) => a.toLowerCase() === normalized)
  );
  if (match) return match;

  // Partial match on name
  match = INGREDIENTS.find((i) =>
    i.name.toLowerCase().includes(normalized) ||
    normalized.includes(i.name.toLowerCase())
  );
  if (match) return match;

  // Partial match on aliases
  match = INGREDIENTS.find((i) =>
    i.aliases.some(
      (a) =>
        a.toLowerCase().includes(normalized) ||
        normalized.includes(a.toLowerCase())
    )
  );
  if (match) return match;

  return null;
}

export function getInteractions(
  ingredients: IngredientRecord[]
): Array<{ a: IngredientRecord; b: IngredientRecord }> {
  const pairs: Array<{ a: IngredientRecord; b: IngredientRecord }> = [];
  for (let i = 0; i < ingredients.length; i++) {
    for (let j = i + 1; j < ingredients.length; j++) {
      const a = ingredients[i];
      const b = ingredients[j];
      const aBlocksB = a.interactions.some(
        (x) => x.toLowerCase() === b.name.toLowerCase()
      );
      const bBlocksA = b.interactions.some(
        (x) => x.toLowerCase() === a.name.toLowerCase()
      );
      if (aBlocksB || bBlocksA) {
        pairs.push({ a, b });
      }
    }
  }
  return pairs;
}

export function getRedundancies(
  ingredients: IngredientRecord[]
): IngredientRecord[][] {
  const groups: IngredientRecord[][] = [];
  const byCategory: Record<string, IngredientRecord[]> = {};

  for (const ing of ingredients) {
    if (!byCategory[ing.category]) byCategory[ing.category] = [];
    byCategory[ing.category].push(ing);
  }

  // Special redundancy pairs
  const redundancyPairs: [string, string][] = [
    ["NMN", "NR"],
    ["Magnesium Glycinate", "Magnesium Citrate"],
    ["Magnesium Glycinate", "Magnesium Malate"],
    ["Magnesium Citrate", "Magnesium Malate"],
    ["Algae Oil", "Fish Oil"],
    ["Alpha-GPC", "CDP-Choline"],
    ["BCAA", "Whey Protein"],
  ];

  const seen = new Set<string>();
  for (const [a, b] of redundancyPairs) {
    const ingA = ingredients.find((i) => i.name === a);
    const ingB = ingredients.find((i) => i.name === b);
    if (ingA && ingB) {
      const key = [a, b].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        groups.push([ingA, ingB]);
      }
    }
  }

  return groups;
}
