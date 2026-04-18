// StackReceipts — Ingredient Master Database (Phase 2A: 100 ingredients)
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

  // ── B-COMPLEX VITAMINS (MISSING) ───────────────────────────
  // NIH ODS: Thiamin Fact Sheet for Health Professionals
  // PubMed: PMID 31826936 - Thiamine deficiency disorders
  {
    name: "Vitamin B1",
    aliases: ["thiamine", "thiamin", "b1", "thiamine hcl", "benfotiamine"],
    category: "vitamin",
    evidence_tier: "strong",
    standard_dose_mg: 1.2,
    min_dose_mg: 1.1,
    max_dose_mg: 100,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin B12", "Folate"],
    notes: "Critical for glucose metabolism. Benfotiamine is fat-soluble form with better bioavailability.",
    goals: ["energy", "focus"],
  },

  // NIH ODS: Riboflavin Fact Sheet for Health Professionals
  // Examine.com: Riboflavin - comprehensive analysis
  {
    name: "Vitamin B2",
    aliases: ["riboflavin", "b2", "riboflavin-5-phosphate"],
    category: "vitamin",
    evidence_tier: "strong",
    standard_dose_mg: 1.3,
    min_dose_mg: 1.1,
    max_dose_mg: 400,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin B12", "Folate"],
    notes: "Required for energy production and antioxidant function. Turns urine bright yellow (harmless).",
    goals: ["energy", "longevity"],
  },

  // NIH ODS: Niacin Fact Sheet for Health Professionals
  // PubMed: PMID 32835308 - Niacin and NAD+ metabolism
  {
    name: "Vitamin B3",
    aliases: ["niacin", "b3", "niacinamide", "nicotinic acid", "nicotinamide"],
    category: "vitamin",
    evidence_tier: "strong",
    standard_dose_mg: 16,
    min_dose_mg: 14,
    max_dose_mg: 35,
    timing: "morning",
    interactions: [],
    synergies: ["NMN", "NR"],
    notes: "Niacinamide preferred over nicotinic acid (no flush). Part of NAD+ pathway. Upper limit 35mg to avoid flushing.",
    goals: ["energy", "longevity"],
  },

  // NIH ODS: Pantothenic Acid Fact Sheet
  // Examine.com: Pantothenic Acid research summary
  {
    name: "Vitamin B5",
    aliases: ["pantothenic acid", "b5", "pantothenate", "calcium pantothenate"],
    category: "vitamin",
    evidence_tier: "moderate",
    standard_dose_mg: 5,
    min_dose_mg: 5,
    max_dose_mg: 600,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin B12", "Folate"],
    notes: "Essential for CoA synthesis and energy metabolism. Widely available in food.",
    goals: ["energy", "recovery"],
  },

  // NIH ODS: Vitamin B6 Fact Sheet for Health Professionals
  // PubMed: PMID 28716455 - B6 status and health outcomes
  {
    name: "Vitamin B6",
    aliases: ["pyridoxine", "b6", "pyridoxal-5-phosphate", "p5p", "p-5-p"],
    category: "vitamin",
    evidence_tier: "strong",
    standard_dose_mg: 1.7,
    min_dose_mg: 1.3,
    max_dose_mg: 100,
    timing: "morning",
    interactions: [],
    synergies: ["Magnesium Glycinate", "Vitamin B12"],
    notes: "P5P is active form. High doses (>200mg/day) long-term can cause neuropathy.",
    goals: ["energy", "sleep", "focus"],
  },

  // NIH ODS: Biotin Fact Sheet for Health Professionals
  // Examine.com: Biotin - effects and research
  {
    name: "Vitamin B7",
    aliases: ["biotin", "b7", "vitamin h"],
    category: "vitamin",
    evidence_tier: "moderate",
    standard_dose_mg: 0.03,
    min_dose_mg: 0.03,
    max_dose_mg: 10,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Popular for hair/skin/nails but evidence is weak in non-deficient individuals. Can interfere with lab tests.",
    goals: ["longevity"],
  },

  // ── TOP NOOTROPICS ─────────────────────────────────────────
  // PubMed: PMID 23981847 - Huperzine A for Alzheimer's
  // Examine.com: Huperzine A cognitive effects
  {
    name: "Huperzine A",
    aliases: ["huperzine", "hup-a"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 0.2,
    min_dose_mg: 0.05,
    max_dose_mg: 0.4,
    timing: "morning",
    interactions: ["Acetylcholinesterase inhibitors"],
    synergies: ["Alpha-GPC"],
    notes: "Acetylcholinesterase inhibitor. Take cyclically (5 days on, 2 off). Don't combine with cholinergics.",
    goals: ["focus", "longevity"],
  },

  // PubMed: PMID 30091355 - Ginkgo biloba cognitive enhancement
  // NIH NCCIH: Ginkgo fact sheet
  {
    name: "Ginkgo Biloba",
    aliases: ["ginkgo", "egb 761"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 240,
    min_dose_mg: 120,
    max_dose_mg: 600,
    timing: "morning",
    interactions: ["Warfarin", "Aspirin", "Fish Oil"],
    synergies: [],
    notes: "Standardized to 24% flavone glycosides, 6% terpene lactones. May increase bleeding risk.",
    goals: ["focus", "longevity"],
  },

  // PubMed: PMID 29935310 - ALCAR neuroprotection
  // Examine.com: Acetyl-L-Carnitine research
  {
    name: "Acetyl-L-Carnitine",
    aliases: ["alcar", "acetyl l-carnitine", "acetylcarnitine"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "morning",
    interactions: [],
    synergies: ["Alpha Lipoic Acid"],
    notes: "Crosses BBB better than L-Carnitine. Take on empty stomach for better absorption.",
    goals: ["focus", "energy", "longevity"],
  },

  // PubMed: PMID 27656235 - Mucuna pruriens L-DOPA
  // Examine.com: Mucuna Pruriens for Parkinson's
  {
    name: "Mucuna Pruriens",
    aliases: ["mucuna", "velvet bean", "l-dopa", "kapikachhu"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 1000,
    timing: "morning",
    interactions: ["MAO inhibitors", "Antidepressants"],
    synergies: [],
    notes: "Natural L-DOPA source. Can deplete dopamine with chronic use. Cycle on/off.",
    goals: ["focus", "energy"],
  },

  // PubMed: PMID 17685272 - 5-HTP for depression
  // Examine.com: 5-HTP serotonin synthesis
  {
    name: "5-HTP",
    aliases: ["5-hydroxytryptophan", "5htp", "5 htp", "oxitriptan"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 100,
    min_dose_mg: 50,
    max_dose_mg: 300,
    timing: "evening",
    interactions: ["SSRIs", "MAO inhibitors"],
    synergies: [],
    notes: "Serotonin precursor. Do NOT combine with antidepressants (serotonin syndrome risk).",
    goals: ["sleep", "focus"],
  },

  // PubMed: PMID 20483021 - Phenylpiracetam cognitive effects
  // Examine.com: Phenylpiracetam (limited data)
  {
    name: "Phenylpiracetam",
    aliases: ["phenotropil", "phenylpiracetam"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 200,
    min_dose_mg: 100,
    max_dose_mg: 600,
    timing: "morning",
    interactions: [],
    synergies: ["Alpha-GPC"],
    notes: "Stimulating racetam. Banned by WADA. Limited human research. Use cyclically.",
    goals: ["focus", "energy"],
  },

  // PubMed: PMID 23696141 - Sulbutiamine for fatigue
  // Examine.com: Sulbutiamine thiamine derivative
  {
    name: "Sulbutiamine",
    aliases: ["arcalion"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 600,
    min_dose_mg: 400,
    max_dose_mg: 1200,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Synthetic B1 derivative. Tolerance develops. Cycle 5 days on, 2 off.",
    goals: ["energy", "focus"],
  },

  // PubMed: PMID 12895683 - Vinpocetine cerebral blood flow
  // Examine.com: Vinpocetine neuroprotection
  {
    name: "Vinpocetine",
    aliases: ["periwinkle extract"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 15,
    min_dose_mg: 5,
    max_dose_mg: 40,
    timing: "morning",
    interactions: ["Warfarin"],
    synergies: [],
    notes: "Enhances cerebral blood flow. Take with food for absorption. Questionable efficacy.",
    goals: ["focus", "longevity"],
  },

  // PubMed: PMID 29989514 - PQQ mitochondrial biogenesis
  // Examine.com: PQQ cognitive and mitochondrial effects
  {
    name: "PQQ",
    aliases: ["pyrroloquinoline quinone", "pqq disodium salt"],
    category: "nootropic",
    evidence_tier: "moderate",
    standard_dose_mg: 20,
    min_dose_mg: 10,
    max_dose_mg: 40,
    timing: "morning",
    interactions: [],
    synergies: ["CoQ10"],
    notes: "Promotes mitochondrial biogenesis. Emerging research, promising but limited human trials.",
    goals: ["energy", "longevity", "focus"],
  },

  // ── ESSENTIAL MINERALS & TRACE ELEMENTS ────────────────────
  // NIH ODS: Chromium Fact Sheet for Health Professionals
  // PubMed: PMID 25293384 - Chromium and glucose metabolism
  {
    name: "Chromium",
    aliases: ["chromium picolinate", "chromium polynicotinate", "gtf chromium"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 0.2,
    min_dose_mg: 0.035,
    max_dose_mg: 1,
    timing: "with-food",
    interactions: [],
    synergies: ["Berberine"],
    notes: "May improve insulin sensitivity. Picolinate form most studied. Evidence mixed.",
    goals: ["longevity", "energy"],
  },

  // NIH ODS: Molybdenum Fact Sheet
  // Examine.com: Molybdenum - trace mineral
  {
    name: "Molybdenum",
    aliases: ["molybdenum glycinate"],
    category: "mineral",
    evidence_tier: "weak",
    standard_dose_mg: 0.045,
    min_dose_mg: 0.045,
    max_dose_mg: 2,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Rarely deficient. Involved in sulfite metabolism. Usually unnecessary to supplement.",
    goals: [],
  },

  // NIH ODS: Manganese Fact Sheet
  // PubMed: PMID 31561722 - Manganese in bone health
  {
    name: "Manganese",
    aliases: ["manganese bisglycinate", "manganese citrate"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 2.3,
    min_dose_mg: 1.8,
    max_dose_mg: 11,
    timing: "any",
    interactions: ["Iron", "Calcium"],
    synergies: [],
    notes: "Competes with iron absorption. Toxicity possible above 11mg/day. Most people get enough from diet.",
    goals: ["longevity"],
  },

  // NIH ODS: Potassium Fact Sheet
  // PubMed: PMID 31510115 - Potassium and cardiovascular health
  {
    name: "Potassium",
    aliases: ["potassium citrate", "potassium chloride", "potassium gluconate"],
    category: "mineral",
    evidence_tier: "strong",
    standard_dose_mg: 3500,
    min_dose_mg: 2600,
    max_dose_mg: 4700,
    timing: "any",
    interactions: ["ACE inhibitors", "Potassium-sparing diuretics"],
    synergies: ["Magnesium Glycinate"],
    notes: "Most supplements limited to 99mg by FDA. Get from food (bananas, potatoes, spinach). High doses can cause cardiac issues.",
    goals: ["energy", "muscle", "recovery"],
  },

  // NIH ODS: Boron fact summary
  // PubMed: PMID 21129941 - Boron for bone and joint health
  {
    name: "Boron",
    aliases: ["boron citrate", "boron glycinate"],
    category: "mineral",
    evidence_tier: "weak",
    standard_dose_mg: 3,
    min_dose_mg: 1,
    max_dose_mg: 20,
    timing: "any",
    interactions: [],
    synergies: ["Vitamin D3", "Magnesium Glycinate"],
    notes: "May support bone health and testosterone. Human evidence limited.",
    goals: ["muscle", "longevity"],
  },

  // PubMed: PMID 8624450 - Vanadium and glucose metabolism
  // Examine.com: Vanadyl sulfate research
  {
    name: "Vanadium",
    aliases: ["vanadyl sulfate", "vanadium sulfate"],
    category: "mineral",
    evidence_tier: "weak",
    standard_dose_mg: 0.05,
    max_dose_mg: 1.8,
    timing: "with-food",
    interactions: [],
    synergies: [],
    notes: "Insulin-mimetic properties. Very limited human evidence. GI side effects common.",
    goals: [],
  },

  // PubMed: PMID 23746642 - Silicon for bone health
  // Examine.com: Silicon/Silica connective tissue
  {
    name: "Silica",
    aliases: ["silicon", "silicon dioxide", "orthosilicic acid", "choline-stabilized orthosilicic acid"],
    category: "mineral",
    evidence_tier: "weak",
    standard_dose_mg: 10,
    min_dose_mg: 5,
    max_dose_mg: 50,
    timing: "any",
    interactions: [],
    synergies: ["Collagen", "Vitamin C"],
    notes: "May support connective tissue. Evidence very limited. Choline-stabilized form preferred.",
    goals: ["longevity", "recovery"],
  },

  // PubMed: PMID 28286995 - MSM for joint pain
  // Examine.com: MSM anti-inflammatory effects
  {
    name: "MSM",
    aliases: ["methylsulfonylmethane", "dimethyl sulfone"],
    category: "mineral",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1500,
    max_dose_mg: 6000,
    timing: "any",
    interactions: [],
    synergies: ["Glucosamine", "Chondroitin"],
    notes: "Organic sulfur compound. Modest evidence for joint pain reduction.",
    goals: ["recovery", "inflammation"],
  },

  // ── BOTANICAL EXTRACTS & ADAPTOGENS ────────────────────────
  // PubMed: PMID 29624410 - Holy basil adaptogenic effects
  // Examine.com: Holy Basil (Tulsi) stress reduction
  {
    name: "Holy Basil",
    aliases: ["tulsi", "ocimum sanctum", "ocimum tenuiflorum"],
    category: "adaptogen",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 300,
    max_dose_mg: 2000,
    timing: "evening",
    interactions: [],
    synergies: ["Ashwagandha"],
    notes: "Adaptogen with anti-stress properties. May lower blood sugar. Standardize to 2.5% ursolic acid.",
    goals: ["sleep", "inflammation", "recovery"],
  },

  // PubMed: PMID 27013349 - Schisandra cognitive and physical
  // Examine.com: Schisandra chinensis adaptogen
  {
    name: "Schisandra",
    aliases: ["schisandra chinensis", "five flavor berry"],
    category: "adaptogen",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 3000,
    timing: "morning",
    interactions: [],
    synergies: ["Rhodiola Rosea"],
    notes: "Adaptogen with hepatoprotective properties. Stimulating — take earlier in day.",
    goals: ["energy", "focus", "longevity"],
  },

  // PubMed: PMID 28266134 - Maca for energy and libido
  // Examine.com: Maca hormonal and energy effects
  {
    name: "Maca Root",
    aliases: ["maca", "lepidium meyenii", "peruvian ginseng"],
    category: "adaptogen",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1500,
    max_dose_mg: 5000,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Adaptogen from Peru. Some evidence for energy and libido. Black maca may be superior for men.",
    goals: ["energy", "muscle"],
  },

  // PubMed: PMID 24046237 - Panax ginseng cognitive effects
  // NIH NCCIH: Asian Ginseng fact sheet
  {
    name: "Panax Ginseng",
    aliases: ["ginseng", "asian ginseng", "korean ginseng", "panax"],
    category: "adaptogen",
    evidence_tier: "moderate",
    standard_dose_mg: 400,
    min_dose_mg: 200,
    max_dose_mg: 800,
    timing: "morning",
    interactions: ["Warfarin", "MAO inhibitors"],
    synergies: [],
    notes: "Standardize to ginsenosides. Stimulating adaptogen. Don't confuse with Siberian ginseng (Eleuthero).",
    goals: ["energy", "focus"],
  },

  // PubMed: PMID 19501822 - Eleutherococcus adaptogenic
  // Examine.com: Eleuthero vs Panax ginseng
  {
    name: "Eleuthero",
    aliases: ["siberian ginseng", "eleutherococcus senticosus"],
    category: "adaptogen",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    min_dose_mg: 150,
    max_dose_mg: 1200,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Not true ginseng. Adaptogen for endurance and immune function. Standardize to eleutherosides.",
    goals: ["energy", "recovery"],
  },

  // PubMed: PMID 22419314 - Pine bark OPC antioxidant
  // Examine.com: Pycnogenol cardiovascular effects
  {
    name: "Pine Bark Extract",
    aliases: ["pycnogenol", "pine bark", "maritime pine"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 150,
    min_dose_mg: 50,
    max_dose_mg: 300,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin C"],
    notes: "Rich in proanthocyanidins (OPCs). Pycnogenol is standardized trademarked form.",
    goals: ["inflammation", "longevity", "recovery"],
  },

  // PubMed: PMID 22332096 - Grape seed extract cardiovascular
  // Examine.com: Grape seed OPC and blood pressure
  {
    name: "Grape Seed Extract",
    aliases: ["gse", "grape seed", "vitis vinifera"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    min_dose_mg: 150,
    max_dose_mg: 600,
    timing: "morning",
    interactions: [],
    synergies: ["Vitamin C"],
    notes: "Standardize to 95% proanthocyanidins. Similar to pine bark but cheaper.",
    goals: ["inflammation", "longevity"],
  },

  // PubMed: PMID 22991095 - Milk thistle hepatoprotection
  // NIH NCCIH: Milk Thistle fact sheet
  {
    name: "Milk Thistle",
    aliases: ["silymarin", "silybum marianum"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 420,
    min_dose_mg: 280,
    max_dose_mg: 700,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Standardize to 80% silymarin. Hepatoprotective. Evidence for liver disease but not proven preventive.",
    goals: ["longevity"],
  },

  // PubMed: PMID 22594963 - Saw palmetto for BPH
  // NIH NCCIH: Saw Palmetto fact sheet
  {
    name: "Saw Palmetto",
    aliases: ["serenoa repens"],
    category: "plant-extract",
    evidence_tier: "weak",
    standard_dose_mg: 320,
    min_dose_mg: 160,
    max_dose_mg: 960,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Traditionally for prostate health. Evidence is mixed. Standardize to 85-95% fatty acids.",
    goals: [],
  },

  // PubMed: PMID 18462866 - Hawthorn for heart failure
  // Examine.com: Hawthorn cardiovascular effects
  {
    name: "Hawthorn",
    aliases: ["crataegus", "hawthorn berry"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 900,
    min_dose_mg: 300,
    max_dose_mg: 1800,
    timing: "any",
    interactions: ["Cardiac glycosides", "Beta-blockers"],
    synergies: ["CoQ10"],
    notes: "Cardiovascular support. May potentiate cardiac medications. Consult physician if on heart meds.",
    goals: ["longevity"],
  },

  // ── SPORTS PERFORMANCE & RECOVERY ──────────────────────────
  // PubMed: PMID 23286834 - HMB muscle preservation
  // Examine.com: HMB (β-Hydroxy β-Methylbutyrate)
  {
    name: "HMB",
    aliases: ["beta-hydroxy beta-methylbutyrate", "β-hmb", "hmb-ca"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1500,
    max_dose_mg: 6000,
    timing: "pre-workout",
    interactions: [],
    synergies: ["Creatine Monohydrate"],
    notes: "Leucine metabolite. Most effective for untrained or during calorie deficit. Mixed evidence in trained athletes.",
    goals: ["muscle", "recovery"],
  },

  // PubMed: PMID 29546641 - Taurine exercise performance
  // Examine.com: Taurine cardiovascular and exercise
  {
    name: "Taurine",
    aliases: ["taurine powder"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 2000,
    min_dose_mg: 500,
    max_dose_mg: 6000,
    timing: "pre-workout",
    interactions: [],
    synergies: ["Caffeine"],
    notes: "Conditionally essential amino acid. Commonly paired with caffeine in energy drinks.",
    goals: ["energy", "muscle", "recovery"],
  },

  // PubMed: PMID 29024635 - L-Carnitine fat metabolism
  // Examine.com: L-Carnitine vs ALCAR
  {
    name: "L-Carnitine",
    aliases: ["carnitine", "levocarnitine", "l-carnitine tartrate"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 2000,
    min_dose_mg: 1000,
    max_dose_mg: 4000,
    timing: "pre-workout",
    interactions: [],
    synergies: [],
    notes: "Fat metabolism and energy. L-Carnitine tartrate preferred for exercise. ALCAR better for cognition.",
    goals: ["energy", "recovery", "muscle"],
  },

  // PubMed: PMID 21116660 - Arginine nitric oxide
  // Examine.com: L-Arginine vs Citrulline
  {
    name: "L-Arginine",
    aliases: ["arginine", "l arginine"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 6000,
    min_dose_mg: 3000,
    max_dose_mg: 10000,
    timing: "pre-workout",
    interactions: [],
    synergies: [],
    notes: "NO precursor but inferior to Citrulline due to poor oral bioavailability. Most data favor citrulline.",
    goals: ["muscle", "energy"],
  },

  // PubMed: PMID 18705755 - Ornithine growth hormone
  // Examine.com: L-Ornithine for sleep and recovery
  {
    name: "L-Ornithine",
    aliases: ["ornithine", "l ornithine"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 2000,
    min_dose_mg: 400,
    max_dose_mg: 6000,
    timing: "evening",
    interactions: [],
    synergies: ["L-Arginine"],
    notes: "May reduce fatigue and improve sleep quality. Limited human evidence.",
    goals: ["sleep", "recovery"],
  },

  // PubMed: PMID 29705056 - Glutathione antioxidant
  // Examine.com: Glutathione oral bioavailability
  {
    name: "Glutathione",
    aliases: ["gsh", "reduced glutathione", "l-glutathione"],
    category: "antioxidant",
    evidence_tier: "weak",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 1000,
    timing: "any",
    interactions: [],
    synergies: ["NAC", "Vitamin C"],
    notes: "Master antioxidant. Oral bioavailability questionable. NAC is precursor with better absorption.",
    goals: ["longevity", "recovery", "inflammation"],
  },

  // PubMed: PMID 30382508 - NAC antioxidant and mucolytic
  // Examine.com: N-Acetylcysteine comprehensive
  {
    name: "NAC",
    aliases: ["n-acetylcysteine", "n-acetyl-cysteine", "n-acetyl cysteine"],
    category: "amino-acid",
    evidence_tier: "strong",
    standard_dose_mg: 600,
    min_dose_mg: 600,
    max_dose_mg: 1800,
    timing: "any",
    interactions: ["Nitroglycerin"],
    synergies: ["Vitamin C", "Glutathione"],
    notes: "Glutathione precursor. Well-studied for antioxidant effects and liver support. Take away from food for better absorption.",
    goals: ["longevity", "recovery", "inflammation"],
  },

  // PubMed: PMID 28394204 - TMG/Betaine athletic performance
  // Examine.com: Betaine (TMG) methyl donor
  {
    name: "Betaine",
    aliases: ["tmg", "trimethylglycine", "betaine anhydrous"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 2500,
    min_dose_mg: 1250,
    max_dose_mg: 6000,
    timing: "pre-workout",
    interactions: [],
    synergies: ["Creatine Monohydrate"],
    notes: "Methyl donor and osmolyte. Evidence for power output and body composition.",
    goals: ["muscle", "recovery", "longevity"],
  },

  // ── ADDITIONAL LONGEVITY COMPOUNDS ─────────────────────────
  // PubMed: PMID 22960622 - Pterostilbene vs resveratrol
  // Examine.com: Pterostilbene bioavailability
  {
    name: "Pterostilbene",
    aliases: ["trans-pterostilbene"],
    category: "antioxidant",
    evidence_tier: "weak",
    standard_dose_mg: 150,
    min_dose_mg: 50,
    max_dose_mg: 250,
    timing: "morning",
    interactions: [],
    synergies: ["Resveratrol", "NMN"],
    notes: "Methylated resveratrol analog with better bioavailability. Limited human trials.",
    goals: ["longevity"],
  },

  // PubMed: PMID 30279143 - Fisetin senolytic effects
  // Examine.com: Fisetin emerging longevity compound
  {
    name: "Fisetin",
    aliases: ["fisetin supplement"],
    category: "antioxidant",
    evidence_tier: "weak",
    standard_dose_mg: 100,
    min_dose_mg: 100,
    max_dose_mg: 500,
    timing: "morning",
    interactions: [],
    synergies: ["Quercetin"],
    notes: "Senolytic flavonoid. Promising preclinical data. Very limited human evidence. Poor oral bioavailability.",
    goals: ["longevity"],
  },

  // PubMed: PMID 29706149 - Spermidine autophagy longevity
  // Examine.com: Spermidine cardioprotection
  {
    name: "Spermidine",
    aliases: ["spermidine trihydrochloride"],
    category: "longevity",
    evidence_tier: "weak",
    standard_dose_mg: 10,
    min_dose_mg: 1,
    max_dose_mg: 10,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Autophagy inducer. Emerging longevity science. Limited human RCTs. Found in wheat germ.",
    goals: ["longevity"],
  },

  // PubMed: PMID 31506863 - Sulforaphane from broccoli
  // Examine.com: Sulforaphane Nrf2 activation
  {
    name: "Sulforaphane",
    aliases: ["broccoli extract", "glucoraphanin"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 30,
    min_dose_mg: 15,
    max_dose_mg: 90,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Nrf2 activator from cruciferous vegetables. Standardize to glucoraphanin + myrosinase enzyme.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 29242678 - Astaxanthin antioxidant
  // Examine.com: Astaxanthin eye and skin health
  {
    name: "Astaxanthin",
    aliases: ["astaxanthin supplement"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 12,
    min_dose_mg: 4,
    max_dose_mg: 24,
    timing: "with-food",
    interactions: [],
    synergies: ["Fish Oil"],
    notes: "Carotenoid from algae. Fat-soluble — take with fats. Evidence for eye and skin health.",
    goals: ["longevity", "recovery"],
  },

  // PubMed: PMID 23571649 - Lycopene prostate and cardiovascular
  // Examine.com: Lycopene carotenoid benefits
  {
    name: "Lycopene",
    aliases: ["lycopene supplement"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 15,
    min_dose_mg: 10,
    max_dose_mg: 30,
    timing: "with-food",
    interactions: [],
    synergies: [],
    notes: "Carotenoid from tomatoes. Fat-soluble. Some evidence for prostate and cardiovascular health.",
    goals: ["longevity"],
  },

  // PubMed: PMID 23571644 - Lutein eye health macular
  // NIH ODS: Lutein and Zeaxanthin fact sheet
  {
    name: "Lutein",
    aliases: ["lutein zeaxanthin", "lutemax"],
    category: "antioxidant",
    evidence_tier: "strong",
    standard_dose_mg: 10,
    min_dose_mg: 6,
    max_dose_mg: 20,
    timing: "with-food",
    interactions: [],
    synergies: ["Zeaxanthin", "Fish Oil"],
    notes: "Carotenoid for eye health. Fat-soluble. Often combined with zeaxanthin. Strong evidence for AMD prevention.",
    goals: ["longevity"],
  },

  // ── PRIORITY 1: MEDICINAL MUSHROOMS & FUNGI ───────────────
  // PubMed: PMID 22593926 - Turkey Tail immune modulation
  // NIH NCCIH: Turkey Tail mushroom for cancer support
  {
    name: "Turkey Tail",
    aliases: ["trametes versicolor", "coriolus versicolor", "psp", "psk"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1000,
    max_dose_mg: 9000,
    timing: "any",
    interactions: [],
    synergies: ["Reishi", "Lion's Mane"],
    notes: "PSP and PSK extracts used in Asian cancer therapy. Immune modulation via beta-glucans. Full-spectrum extract preferred.",
    goals: ["longevity", "inflammation", "recovery"],
  },

  // PubMed: PMID 24624089 - Chaga antioxidant and anticancer
  // Examine.com: Chaga mushroom immune effects
  {
    name: "Chaga",
    aliases: ["inonotus obliquus", "chaga mushroom"],
    category: "mushroom",
    evidence_tier: "weak",
    standard_dose_mg: 2000,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "morning",
    interactions: ["Warfarin"],
    synergies: ["Reishi"],
    notes: "Very high ORAC score. Most evidence is in vitro. May potentiate anticoagulants. Quality varies widely.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 24266378 - Shiitake immune and cardiovascular
  // Examine.com: Lentinan from shiitake mushrooms
  {
    name: "Shiitake",
    aliases: ["lentinula edodes", "lentinan", "shiitake mushroom"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 1000,
    max_dose_mg: 5000,
    timing: "any",
    interactions: [],
    synergies: ["Reishi", "Maitake"],
    notes: "Lentinan is active polysaccharide. Immune support and modest cholesterol benefits. Food form widely consumed.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 19452495 - Maitake beta-glucan immune effects
  // Examine.com: Maitake D-fraction for cancer
  {
    name: "Maitake",
    aliases: ["grifola frondosa", "maitake mushroom", "d-fraction"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1000,
    max_dose_mg: 7000,
    timing: "any",
    interactions: ["Diabetes medications"],
    synergies: ["Shiitake", "Reishi"],
    notes: "D-fraction is standardized extract. May lower blood glucose. Immune modulating via beta-glucans.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 28266682 - Tremella polysaccharide skin hydration
  // Research: Tremella fuciformis for skin and neuroprotection
  {
    name: "Tremella",
    aliases: ["tremella fuciformis", "snow fungus", "silver ear mushroom"],
    category: "mushroom",
    evidence_tier: "weak",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "any",
    interactions: [],
    synergies: ["Collagen", "Hyaluronic Acid"],
    notes: "Polysaccharides hold water (like hyaluronic acid). Traditional for skin health. Very limited human evidence.",
    goals: ["longevity"],
  },

  // PubMed: PMID 15630179 - Agaricus blazei immune modulation
  // Research: AbM mushroom anticancer and immune effects
  {
    name: "Agaricus Blazei",
    aliases: ["agaricus blazei murill", "abm mushroom", "himematsutake"],
    category: "mushroom",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1500,
    max_dose_mg: 6000,
    timing: "any",
    interactions: [],
    synergies: ["Turkey Tail", "Maitake"],
    notes: "Beta-glucan rich. Used in integrative cancer care in Brazil and Japan. Quality control critical.",
    goals: ["longevity", "inflammation"],
  },

  // ── PRIORITY 2: SPECIALTY AMINO ACIDS & PEPTIDES ───────────
  // PubMed: PMID 25797188 - L-Tyrosine cognitive stress buffer
  // Examine.com: Tyrosine for stress and cognition
  {
    name: "L-Tyrosine",
    aliases: ["tyrosine", "l tyrosine", "n-acetyl-l-tyrosine", "nalt"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "morning",
    interactions: ["MAO inhibitors", "L-Dopa"],
    synergies: ["Caffeine"],
    notes: "Catecholamine precursor. Effective during acute stress. NALT has poor conversion. Use regular L-Tyrosine.",
    goals: ["focus", "energy"],
  },

  // PubMed: PMID 23675353 - Agmatine neuroprotection and pain
  // Examine.com: Agmatine sulfate comprehensive review
  {
    name: "Agmatine Sulfate",
    aliases: ["agmatine", "agmatine sulfate"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 2500,
    timing: "pre-workout",
    interactions: [],
    synergies: ["Citrulline"],
    notes: "Arginine metabolite. May enhance nitric oxide and insulin sensitivity. Human evidence limited.",
    goals: ["muscle", "recovery"],
  },

  // PubMed: PMID 28179129 - D-Aspartic Acid testosterone
  // Examine.com: DAA for testosterone (mixed results)
  {
    name: "D-Aspartic Acid",
    aliases: ["daa", "d aspartic acid", "d-aa"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 3000,
    min_dose_mg: 2000,
    max_dose_mg: 6000,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "May transiently boost testosterone in untrained men. Effects diminish with continued use. Evidence is inconsistent.",
    goals: ["muscle", "energy"],
  },

  // PubMed: PMID 27181287 - L-Lysine anxiety and cortisol
  // NIH: Lysine as essential amino acid
  {
    name: "L-Lysine",
    aliases: ["lysine", "l lysine"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "any",
    interactions: ["Arginine"],
    synergies: [],
    notes: "Essential amino acid. Some evidence for anxiety reduction and HSV suppression. Competes with arginine.",
    goals: ["recovery", "inflammation"],
  },

  // PubMed: PMID 30016532 - L-Tryptophan serotonin sleep
  // Examine.com: Tryptophan vs 5-HTP
  {
    name: "L-Tryptophan",
    aliases: ["tryptophan", "l tryptophan"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 5000,
    timing: "evening",
    interactions: ["SSRIs", "MAO inhibitors"],
    synergies: [],
    notes: "Serotonin precursor. Safer than 5-HTP long-term. Do NOT combine with antidepressants (serotonin syndrome risk).",
    goals: ["sleep"],
  },

  // PubMed: PMID 30293638 - Bovine colostrum immune and gut
  // Examine.com: Colostrum for immunity and exercise
  {
    name: "Colostrum",
    aliases: ["bovine colostrum", "colostrum powder"],
    category: "protein",
    evidence_tier: "moderate",
    standard_dose_mg: 10000,
    min_dose_mg: 5000,
    max_dose_mg: 60000,
    timing: "morning",
    interactions: [],
    synergies: ["Probiotics"],
    notes: "First milk rich in immunoglobulins and growth factors. Benefits gut health and immunity. Take on empty stomach.",
    goals: ["recovery", "inflammation", "muscle"],
  },

  // PubMed: PMID 23846824 - Carnosine antioxidant aging
  // Examine.com: Carnosine dipeptide longevity
  {
    name: "Carnosine",
    aliases: ["l-carnosine", "beta-alanyl-l-histidine"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "any",
    interactions: [],
    synergies: ["Beta-Alanine"],
    notes: "Histidine-beta-alanine dipeptide. Beta-alanine increases muscle carnosine more efficiently. Direct supplementation may benefit aging tissues.",
    goals: ["longevity", "muscle", "recovery"],
  },

  // PubMed: PMID 28436061 - Anserine antioxidant fatigue
  // Research: Anserine and carnosine in muscle
  {
    name: "Anserine",
    aliases: ["beta-alanyl-methylhistidine"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 3000,
    timing: "any",
    interactions: [],
    synergies: ["Carnosine"],
    notes: "Methylated carnosine analog. Found in chicken/turkey. May reduce fatigue. Very limited human data.",
    goals: ["recovery", "energy"],
  },

  // ── PRIORITY 3: ADDITIONAL COGNITIVE ENHANCERS ─────────────
  // PubMed: PMID 24499729 - Aniracetam anxiolytic and memory
  // Examine.com: Aniracetam fat-soluble racetam
  {
    name: "Aniracetam",
    aliases: ["aniracetam"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 1500,
    min_dose_mg: 750,
    max_dose_mg: 3000,
    timing: "morning",
    interactions: [],
    synergies: ["Alpha-GPC", "CDP-Choline"],
    notes: "Fat-soluble racetam. Take with fats. Anxiolytic properties. Limited human trials. Legal status varies by country.",
    goals: ["focus"],
  },

  // PubMed: PMID 21689376 - Noopept cognitive enhancement
  // Examine.com: Noopept peptide nootropic
  {
    name: "Noopept",
    aliases: ["n-phenylacetyl-l-prolylglycine ethyl ester", "gvs-111"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 20,
    min_dose_mg: 10,
    max_dose_mg: 40,
    timing: "morning",
    interactions: [],
    synergies: ["Alpha-GPC"],
    notes: "Synthetic peptide. Very potent per mg. Russian research only. Limited Western validation.",
    goals: ["focus", "longevity"],
  },

  // PubMed: PMID 3305593 - Centrophenoxine neuroprotection
  // Examine.com: Centrophenoxine DMAE derivative
  {
    name: "Centrophenoxine",
    aliases: ["meclofenoxate", "lucidril"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 2000,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "DMAE + pCPA. Old European nootropic. Removes lipofuscin in animals. Human evidence very limited.",
    goals: ["focus", "longevity"],
  },

  // PubMed: PMID 25933484 - Uridine cognition and mood
  // Examine.com: Uridine monophosphate neurogenesis
  {
    name: "Uridine Monophosphate",
    aliases: ["uridine", "ump", "uridine-5-monophosphate"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 1000,
    timing: "evening",
    interactions: [],
    synergies: ["CDP-Choline", "Fish Oil"],
    notes: "Nucleotide for RNA and membrane synthesis. Requires choline and DHA for synapse formation. Emerging evidence.",
    goals: ["focus", "sleep"],
  },

  // PubMed: PMID 30854032 - SAMe depression and methylation
  // NIH NCCIH: SAMe for depression and osteoarthritis
  {
    name: "SAMe",
    aliases: ["s-adenosyl-l-methionine", "s-adenosylmethionine", "same supplement"],
    category: "nootropic",
    evidence_tier: "strong",
    standard_dose_mg: 800,
    min_dose_mg: 400,
    max_dose_mg: 1600,
    timing: "morning",
    interactions: ["SSRIs", "MAO inhibitors"],
    synergies: ["Vitamin B12", "Folate"],
    notes: "Universal methyl donor. Evidence for depression and joint pain. Expensive. Take on empty stomach. Risk of mania in bipolar.",
    goals: ["focus", "recovery", "inflammation"],
  },

  // PubMed: PMID 28899646 - Polygala tenuifolia memory cognition
  // Research: Yuan Zhi traditional nootropic
  {
    name: "Polygala Tenuifolia",
    aliases: ["yuan zhi", "polygala", "chinese senega"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 300,
    min_dose_mg: 100,
    max_dose_mg: 600,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Traditional Chinese nootropic. Preliminary evidence for memory. Limited rigorous trials.",
    goals: ["focus", "longevity"],
  },

  // PubMed: PMID 20374974 - Gotu Kola cognitive anxiolytic
  // Examine.com: Centella asiatica brain and skin
  {
    name: "Gotu Kola",
    aliases: ["centella asiatica", "brahmi", "indian pennywort"],
    category: "nootropic",
    evidence_tier: "weak",
    standard_dose_mg: 750,
    min_dose_mg: 500,
    max_dose_mg: 2000,
    timing: "morning",
    interactions: [],
    synergies: [],
    notes: "Not the same as Bacopa (also called brahmi). Adaptogenic. Evidence limited but traditionally used for cognition.",
    goals: ["focus", "recovery"],
  },

  // ── PRIORITY 4: SLEEP & RELAXATION COMPOUNDS ───────────────
  // PubMed: PMID 23133739 - Lemon balm anxiolytic and sleep
  // Examine.com: Melissa officinalis for anxiety
  {
    name: "Lemon Balm",
    aliases: ["melissa officinalis", "melissa", "lemon balm extract"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 600,
    min_dose_mg: 300,
    max_dose_mg: 1200,
    timing: "evening",
    interactions: ["Thyroid medications"],
    synergies: ["Valerian Root"],
    notes: "May reduce anxiety and improve sleep quality. Can suppress thyroid function at high doses.",
    goals: ["sleep"],
  },

  // PubMed: PMID 22855355 - Magnolia bark anxiolytic honokiol
  // Examine.com: Magnolia officinalis for stress
  {
    name: "Magnolia Bark",
    aliases: ["magnolia officinalis", "honokiol", "magnolol"],
    category: "plant-extract",
    evidence_tier: "weak",
    standard_dose_mg: 400,
    min_dose_mg: 200,
    max_dose_mg: 800,
    timing: "evening",
    interactions: [],
    synergies: ["Ashwagandha"],
    notes: "Honokiol and magnolol are active compounds. Limited human data. Traditionally used for anxiety and sleep.",
    goals: ["sleep", "inflammation"],
  },

  // PubMed: PMID 23235473 - Passionflower anxiety and sleep
  // NIH NCCIH: Passionflower fact sheet
  {
    name: "Passionflower",
    aliases: ["passiflora incarnata", "passion flower"],
    category: "plant-extract",
    evidence_tier: "weak",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 1000,
    timing: "evening",
    interactions: ["Sedatives"],
    synergies: ["Valerian Root", "Lemon Balm"],
    notes: "GABAergic activity. Modest evidence for anxiety. Sleep evidence weak. May potentiate sedatives.",
    goals: ["sleep"],
  },

  // PubMed: PMID 29486332 - GABA oral bioavailability anxiety
  // Examine.com: GABA supplement BBB crossing debate
  {
    name: "GABA",
    aliases: ["gamma-aminobutyric acid", "gaba supplement"],
    category: "amino-acid",
    evidence_tier: "weak",
    standard_dose_mg: 750,
    min_dose_mg: 250,
    max_dose_mg: 3000,
    timing: "evening",
    interactions: [],
    synergies: [],
    notes: "Oral GABA does NOT cross BBB in meaningful amounts. May work via gut-brain axis. Evidence is weak.",
    goals: ["sleep"],
  },

  // PubMed: PMID 28797566 - Inositol for anxiety and mood
  // Examine.com: Myo-inositol for PCOS and mental health
  {
    name: "Inositol",
    aliases: ["myo-inositol", "inositol powder"],
    category: "supplement",
    evidence_tier: "moderate",
    standard_dose_mg: 2000,
    min_dose_mg: 1000,
    max_dose_mg: 18000,
    timing: "evening",
    interactions: [],
    synergies: [],
    notes: "B-vitamin-like compound. Evidence for anxiety, OCD, PCOS. High doses well-tolerated. Myo-inositol is primary form.",
    goals: ["sleep"],
  },

  // ── PRIORITY 5: SPORTS & RECOVERY ──────────────────────────
  // PubMed: PMID 21394604 - D-Ribose for heart and energy
  // Examine.com: Ribose for ATP synthesis
  {
    name: "D-Ribose",
    aliases: ["ribose", "d ribose"],
    category: "supplement",
    evidence_tier: "moderate",
    standard_dose_mg: 5000,
    min_dose_mg: 3000,
    max_dose_mg: 15000,
    timing: "pre-workout",
    interactions: [],
    synergies: ["Creatine Monohydrate", "Peak ATP"],
    notes: "5-carbon sugar for ATP synthesis. Evidence for heart failure and chronic fatigue. May help recovery from intense exercise.",
    goals: ["energy", "recovery"],
  },

  // PubMed: PMID 28852372 - Leucine mTOR muscle protein synthesis
  // Examine.com: Leucine most anabolic BCAA
  {
    name: "Leucine",
    aliases: ["l-leucine", "leucine"],
    category: "amino-acid",
    evidence_tier: "strong",
    standard_dose_mg: 3000,
    min_dose_mg: 2000,
    max_dose_mg: 5000,
    timing: "post-workout",
    interactions: [],
    synergies: ["Isoleucine", "Valine", "Whey Protein"],
    notes: "Most important BCAA for mTOR activation. Threshold ~2-3g to trigger muscle protein synthesis. Redundant if eating enough protein.",
    goals: ["muscle", "recovery"],
  },

  // PubMed: PMID 27175428 - Isoleucine glucose metabolism
  // Examine.com: Isoleucine BCAA secondary benefits
  {
    name: "Isoleucine",
    aliases: ["l-isoleucine", "isoleucine"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 1000,
    max_dose_mg: 3000,
    timing: "post-workout",
    interactions: [],
    synergies: ["Leucine", "Valine"],
    notes: "BCAA for glucose metabolism and immune function. Less anabolic than leucine. Usually redundant with adequate dietary protein.",
    goals: ["muscle", "energy", "recovery"],
  },

  // PubMed: PMID 26508701 - Valine BCAA muscle metabolism
  // Examine.com: Valine for exercise metabolism
  {
    name: "Valine",
    aliases: ["l-valine", "valine"],
    category: "amino-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 1000,
    max_dose_mg: 3000,
    timing: "post-workout",
    interactions: [],
    synergies: ["Leucine", "Isoleucine"],
    notes: "BCAA for muscle energy metabolism. Least studied of the three BCAAs. Redundant with adequate protein intake.",
    goals: ["muscle", "recovery"],
  },

  // PubMed: PMID 26900384 - PEAK ATP exercise performance
  // Research: Adenosine 5'-triphosphate oral supplementation
  {
    name: "Peak ATP",
    aliases: ["adenosine triphosphate", "atp disodium", "peak atp"],
    category: "supplement",
    evidence_tier: "weak",
    standard_dose_mg: 400,
    min_dose_mg: 400,
    max_dose_mg: 600,
    timing: "pre-workout",
    interactions: [],
    synergies: ["Creatine Monohydrate", "D-Ribose"],
    notes: "Oral ATP supplement. PEAK ATP is trademarked form. Evidence is limited and industry-funded. Mechanism unclear.",
    goals: ["muscle", "energy"],
  },

  // ── PRIORITY 6: CARDIOVASCULAR & METABOLIC ─────────────────
  // PubMed: PMID 20924523 - Red yeast rice vs statins
  // NIH NCCIH: Red yeast rice for cholesterol
  {
    name: "Red Yeast Rice",
    aliases: ["monascus purpureus", "red rice yeast"],
    category: "plant-extract",
    evidence_tier: "strong",
    standard_dose_mg: 2400,
    min_dose_mg: 1200,
    max_dose_mg: 4800,
    timing: "evening",
    interactions: ["Statins", "Grapefruit"],
    synergies: ["CoQ10"],
    notes: "Contains monacolin K (identical to lovastatin). Effective for cholesterol but FDA limits monacolin content. Same statin risks apply.",
    goals: ["longevity"],
  },

  // PubMed: PMID 23808441 - Policosanol cholesterol effects
  // Examine.com: Policosanol from sugar cane
  {
    name: "Policosanol",
    aliases: ["octacosanol", "sugar cane wax"],
    category: "plant-extract",
    evidence_tier: "weak",
    standard_dose_mg: 10,
    min_dose_mg: 5,
    max_dose_mg: 20,
    timing: "evening",
    interactions: ["Warfarin"],
    synergies: [],
    notes: "Cuban research showed benefits; independent replication failed. Source matters (sugar cane vs beeswax). Evidence very weak.",
    goals: ["longevity"],
  },

  // PubMed: PMID 24126178 - Plant sterols cholesterol reduction
  // NIH: Phytosterols for cardiovascular health
  {
    name: "Plant Sterols",
    aliases: ["phytosterols", "plant stanols", "beta-sitosterol"],
    category: "plant-extract",
    evidence_tier: "strong",
    standard_dose_mg: 2000,
    min_dose_mg: 1300,
    max_dose_mg: 3000,
    timing: "with-food",
    interactions: [],
    synergies: [],
    notes: "Compete with cholesterol absorption. FDA-approved health claim. Take with meals containing cholesterol/fat. Can reduce fat-soluble vitamin absorption.",
    goals: ["longevity"],
  },

  // PubMed: PMID 23657930 - Bergamot polyphenols lipid metabolism
  // Research: Bergamot extract for metabolic syndrome
  {
    name: "Bergamot",
    aliases: ["citrus bergamia", "bergamot extract", "bpf"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 1000,
    min_dose_mg: 500,
    max_dose_mg: 1500,
    timing: "with-food",
    interactions: ["Statins"],
    synergies: [],
    notes: "Polyphenol-rich citrus. Evidence for lipid and glucose metabolism. May potentiate statins. Standardize to ≥38% polyphenols.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 23638827 - Aged garlic cardiovascular benefits
  // Examine.com: Aged garlic extract vs raw garlic
  {
    name: "Aged Garlic Extract",
    aliases: ["age", "kyolic", "aged garlic"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 1200,
    min_dose_mg: 600,
    max_dose_mg: 2400,
    timing: "with-food",
    interactions: ["Warfarin", "Antiplatelet drugs"],
    synergies: [],
    notes: "Fermented garlic. Better tolerated than raw (no odor). Evidence for blood pressure and cholesterol. May increase bleeding risk.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 25479156 - Nattokinase fibrinolytic activity
  // Examine.com: Nattokinase for cardiovascular health
  {
    name: "Nattokinase",
    aliases: ["natto extract"],
    category: "enzyme",
    evidence_tier: "moderate",
    standard_dose_mg: 2000,
    min_dose_mg: 1000,
    max_dose_mg: 4000,
    timing: "any",
    interactions: ["Warfarin", "Aspirin"],
    synergies: [],
    notes: "Enzyme from natto (fermented soybeans). Fibrinolytic activity. May reduce blood viscosity. Increases bleeding risk with anticoagulants.",
    goals: ["longevity"],
  },

  // ── PRIORITY 7: JOINT & CONNECTIVE TISSUE ──────────────────
  // PubMed: PMID 27852613 - Glucosamine for osteoarthritis
  // NIH NCCIH: Glucosamine fact sheet
  {
    name: "Glucosamine",
    aliases: ["glucosamine sulfate", "glucosamine hcl", "glucosamine hydrochloride"],
    category: "supplement",
    evidence_tier: "moderate",
    standard_dose_mg: 1500,
    min_dose_mg: 1500,
    max_dose_mg: 2000,
    timing: "any",
    interactions: ["Warfarin"],
    synergies: ["Chondroitin", "MSM"],
    notes: "Sulfate form preferred over HCl. Evidence mixed but some benefit for knee OA. May affect blood glucose in diabetics.",
    goals: ["recovery", "inflammation"],
  },

  // PubMed: PMID 25222212 - Chondroitin for osteoarthritis
  // Examine.com: Chondroitin sulfate joint health
  {
    name: "Chondroitin",
    aliases: ["chondroitin sulfate", "chondroitin sulphate"],
    category: "supplement",
    evidence_tier: "moderate",
    standard_dose_mg: 1200,
    min_dose_mg: 800,
    max_dose_mg: 1600,
    timing: "any",
    interactions: ["Warfarin"],
    synergies: ["Glucosamine", "MSM"],
    notes: "Glycosaminoglycan from cartilage. Often combined with glucosamine. Evidence modest. May increase bleeding risk.",
    goals: ["recovery", "inflammation"],
  },

  // PubMed: PMID 23038112 - Hyaluronic acid oral for skin joints
  // Examine.com: Hyaluronic acid supplementation
  {
    name: "Hyaluronic Acid",
    aliases: ["ha", "sodium hyaluronate", "hyaluronan"],
    category: "supplement",
    evidence_tier: "weak",
    standard_dose_mg: 200,
    min_dose_mg: 80,
    max_dose_mg: 240,
    timing: "any",
    interactions: [],
    synergies: ["Collagen", "Vitamin C"],
    notes: "Oral bioavailability questionable. Some evidence for skin hydration and joint comfort. Low molecular weight preferred.",
    goals: ["recovery", "longevity"],
  },

  // PubMed: PMID 24915439 - UC-II collagen for joint health
  // Research: Undenatured type II collagen vs glucosamine
  {
    name: "UC-II Collagen",
    aliases: ["uc-ii", "undenatured type ii collagen", "type 2 collagen"],
    category: "protein",
    evidence_tier: "moderate",
    standard_dose_mg: 40,
    min_dose_mg: 40,
    max_dose_mg: 40,
    timing: "any",
    interactions: [],
    synergies: [],
    notes: "Undenatured type II collagen. Works via oral tolerance mechanism (very different from hydrolyzed collagen). Dose is only 40mg. Evidence for joint pain.",
    goals: ["recovery", "inflammation"],
  },

  // PubMed: PMID 18384450 - Boswellia anti-inflammatory OA
  // Examine.com: Boswellia serrata for joints
  {
    name: "Boswellia",
    aliases: ["boswellia serrata", "indian frankincense", "akba"],
    category: "plant-extract",
    evidence_tier: "moderate",
    standard_dose_mg: 300,
    min_dose_mg: 300,
    max_dose_mg: 1000,
    timing: "with-food",
    interactions: [],
    synergies: ["Turmeric", "MSM"],
    notes: "Standardize to boswellic acids (≥30%) or AKBA. Anti-inflammatory. Evidence for osteoarthritis and inflammatory bowel disease.",
    goals: ["inflammation", "recovery"],
  },

  // ── PRIORITY 8: EMERGING LONGEVITY & CELLULAR HEALTH ───────
  // PubMed: PMID 31504263 - Urolithin A mitophagy longevity
  // Research: Urolithin A from pomegranate clinical trials
  {
    name: "Urolithin A",
    aliases: ["ua", "urolithin a"],
    category: "longevity",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 1000,
    timing: "morning",
    interactions: [],
    synergies: ["NMN", "Resveratrol"],
    notes: "Mitophagy inducer from pomegranate metabolites. Not everyone produces it from diet. Direct supplementation bypasses gut microbiome variability.",
    goals: ["longevity", "muscle", "energy"],
  },

  // PubMed: PMID 23953134 - EGCG green tea catechin benefits
  // Examine.com: EGCG antioxidant and metabolism
  {
    name: "EGCG",
    aliases: ["epigallocatechin gallate", "green tea extract", "egcg"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 400,
    min_dose_mg: 200,
    max_dose_mg: 800,
    timing: "morning",
    interactions: ["Iron"],
    synergies: ["Caffeine"],
    notes: "Primary catechin in green tea. Antioxidant and mild metabolic benefits. High doses may affect liver enzymes. Take between meals for iron absorption.",
    goals: ["longevity", "inflammation", "energy"],
  },

  // PubMed: PMID 28736021 - Hesperidin cardiovascular citrus
  // Examine.com: Hesperidin from citrus bioflavonoids
  {
    name: "Hesperidin",
    aliases: ["hesperidin", "citrus bioflavonoid"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 150,
    max_dose_mg: 1000,
    timing: "any",
    interactions: [],
    synergies: ["Vitamin C", "Quercetin"],
    notes: "Citrus flavonoid. Evidence for vascular health and blood pressure. Often combined with diosmin for venous insufficiency.",
    goals: ["longevity", "inflammation"],
  },

  // PubMed: PMID 27684632 - Rutin antioxidant vascular health
  // Examine.com: Rutin quercetin glycoside
  {
    name: "Rutin",
    aliases: ["rutoside", "quercetin rutinoside"],
    category: "antioxidant",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 250,
    max_dose_mg: 1000,
    timing: "any",
    interactions: [],
    synergies: ["Quercetin", "Vitamin C"],
    notes: "Quercetin glycoside from buckwheat and citrus. Antioxidant with vascular benefits. May strengthen capillaries.",
    goals: ["longevity", "inflammation"],
  },

  // ── ADDITIONAL HIGH-VALUE COMPOUNDS ────────────────────────
  // PubMed: PMID 23847105 - Zeaxanthin macular pigment eye health
  // NIH ODS: Lutein and Zeaxanthin fact sheet
  {
    name: "Zeaxanthin",
    aliases: ["zeaxanthin supplement"],
    category: "antioxidant",
    evidence_tier: "strong",
    standard_dose_mg: 2,
    min_dose_mg: 2,
    max_dose_mg: 10,
    timing: "with-food",
    interactions: [],
    synergies: ["Lutein", "Fish Oil"],
    notes: "Carotenoid concentrated in macula. Fat-soluble. Usually paired with lutein. Strong evidence for AMD and macular health.",
    goals: ["longevity"],
  },

  // PubMed: PMID 24368652 - Bromelain anti-inflammatory enzyme
  // Examine.com: Bromelain digestive and anti-inflammatory
  {
    name: "Bromelain",
    aliases: ["bromelain enzyme", "pineapple enzyme"],
    category: "enzyme",
    evidence_tier: "moderate",
    standard_dose_mg: 500,
    min_dose_mg: 200,
    max_dose_mg: 2000,
    timing: "any",
    interactions: ["Anticoagulants", "Antibiotics"],
    synergies: ["Quercetin", "Turmeric"],
    notes: "Proteolytic enzyme from pineapple. Anti-inflammatory when taken on empty stomach, digestive when with food. Enhances quercetin absorption.",
    goals: ["inflammation", "recovery"],
  },

  // PubMed: PMID 28704802 - Spirulina nutrition immune antioxidant
  // Examine.com: Spirulina comprehensive analysis
  {
    name: "Spirulina",
    aliases: ["arthrospira platensis", "blue-green algae"],
    category: "supplement",
    evidence_tier: "moderate",
    standard_dose_mg: 3000,
    min_dose_mg: 1000,
    max_dose_mg: 10000,
    timing: "any",
    interactions: [],
    synergies: ["Chlorella"],
    notes: "Blue-green algae superfood. High in protein and micronutrients. Phycocyanin is active antioxidant. Quality control important (heavy metals).",
    goals: ["energy", "longevity", "inflammation"],
  },

  // PubMed: PMID 24867635 - Chlorella detox immune nutrition
  // Research: Chlorella growth factor and detoxification
  {
    name: "Chlorella",
    aliases: ["chlorella pyrenoidosa", "chlorella vulgaris"],
    category: "supplement",
    evidence_tier: "weak",
    standard_dose_mg: 3000,
    min_dose_mg: 1000,
    max_dose_mg: 10000,
    timing: "any",
    interactions: ["Warfarin"],
    synergies: ["Spirulina"],
    notes: "Green algae rich in chlorophyll. Claims for detox not well-supported. High vitamin K content can affect warfarin. CGF (Chlorella Growth Factor) is marketing term.",
    goals: ["longevity"],
  },

  // PubMed: PMID 24203717 - ALA plant omega-3 cardiovascular
  // Examine.com: Alpha-linolenic acid vs EPA/DHA
  {
    name: "ALA",
    aliases: ["alpha-linolenic acid", "flaxseed oil", "ala omega-3"],
    category: "fatty-acid",
    evidence_tier: "moderate",
    standard_dose_mg: 2000,
    min_dose_mg: 1000,
    max_dose_mg: 5000,
    timing: "with-food",
    interactions: [],
    synergies: [],
    notes: "Plant omega-3. Converts poorly to EPA/DHA (~5-10%). Vegan option but not equivalent to fish oil. Found in flax, chia, walnuts.",
    goals: ["inflammation", "longevity"],
  },

  // PubMed: PMID 29361868 - Piperine bioavailability enhancer
  // Examine.com: Black pepper piperine nutrient absorption (already exists but adding standalone)
  {
    name: "Piperine",
    aliases: ["bioperine", "black pepper piperine"],
    category: "bioavailability-enhancer",
    evidence_tier: "strong",
    standard_dose_mg: 5,
    min_dose_mg: 5,
    max_dose_mg: 20,
    timing: "any",
    interactions: [],
    synergies: ["Turmeric", "Curcumin", "Quercetin"],
    notes: "Same as Black Pepper Extract - added as standalone since often listed separately. Dramatically increases bioavailability of many compounds.",
    goals: [],
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
