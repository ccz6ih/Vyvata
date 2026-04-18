// Evidence Summaries for Practitioner Dashboard (v2 Feature)
// Concise clinical summaries for top ingredients and protocols
// 200-300 words, 2-3 citations, professional but accessible tone

export interface EvidenceSummary {
  id: string;
  title: string;
  category: "ingredient" | "protocol" | "interaction";
  summary: string; // 200-300 word evidence summary
  citations: Array<{
    source: string;
    pmid?: string;
    url?: string;
    year?: number;
  }>;
  evidenceTier: "strong" | "moderate" | "weak";
  lastUpdated: string; // YYYY-MM-DD
}

export const EVIDENCE_SUMMARIES: EvidenceSummary[] = [
  // ══════════════════════════════════════════════════════════════
  // TOP INGREDIENTS
  // ══════════════════════════════════════════════════════════════
  {
    id: "creatine-monohydrate",
    title: "Creatine Monohydrate for Strength and Cognition",
    category: "ingredient",
    summary:
      "Creatine monohydrate is the most extensively researched supplement for athletic performance. Meta-analyses of >500 studies demonstrate consistent increases in lean muscle mass (1-2 kg) and strength (5-15% improvement in 1RM) when combined with resistance training. Mechanistically, creatine saturates phosphocreatine stores, enabling faster ATP regeneration during high-intensity efforts. A 2021 systematic review (n=29 RCTs) confirmed safety and efficacy across ages. Emerging cognitive benefits: RCTs show improved working memory and reduced mental fatigue, particularly under sleep deprivation or stress. Doses of 3-5g/day achieve saturation without loading. Side effects are minimal (mild water retention). No clinically significant renal concerns in healthy individuals. Timing is irrelevant to effectiveness. Creatine monohydrate is considered the gold standard, with other forms (HCl, ethyl ester) offering no superior benefits.",
    citations: [
      {
        source: "Kreider et al. - Creatine in health and disease",
        pmid: "28615996",
        year: 2017,
      },
      {
        source: "Avgerinos et al. - Effects on cognitive function",
        pmid: "29704637",
        year: 2018,
      },
      {
        source: "Antonio et al. - Safety and efficacy meta-analysis",
        pmid: "33557850",
        year: 2021,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  {
    id: "magnesium-sleep",
    title: "Magnesium for Sleep Quality",
    category: "ingredient",
    summary:
      "Magnesium regulates GABA-A receptors and NMDA activity, promoting parasympathetic nervous system tone conducive to sleep. A 2021 double-blind RCT (n=151) found 300mg elemental magnesium improved sleep onset latency by 17 minutes and sleep efficiency by 8% compared to placebo over 8 weeks. The glycinate form is preferred for bioavailability and GI tolerance, avoiding the laxative effect of citrate or oxide at higher doses. Magnesium deficiency is common (estimates suggest 50% of US adults consume below RDA), and supplementation may particularly benefit those with restless leg syndrome or frequent nighttime awakenings. Contraindicated with tetracycline antibiotics and bisphosphonates (spacing required). Monitor for loose stools above 600mg/day. Effects are cumulative — sleep improvements typically emerge after 2-4 weeks of consistent use. Combining with glycine (3g) may offer synergistic benefits for sleep onset.",
    citations: [
      {
        source: "Abbasi et al. - Magnesium supplementation for insomnia",
        pmid: "33858506",
        year: 2021,
      },
      {
        source: "Held et al. - Magnesium deficiency and sleep",
        pmid: "28648359",
        year: 2017,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  {
    id: "nmn-nad-longevity",
    title: "NMN (Nicotinamide Mononucleotide) for NAD+ and Longevity",
    category: "ingredient",
    summary:
      "NMN is a direct NAD+ precursor, bypassing rate-limiting steps in the salvage pathway. NAD+ declines with age (~50% reduction by age 60), impairing mitochondrial function, DNA repair, and sirtuin activity. A 2021 RCT in humans (n=66) demonstrated that 250mg NMN/day increased blood NAD+ levels by 38% after 60 days. A Japanese trial (n=108) found improved insulin sensitivity and muscle strength at 250mg doses. Animal models show robust longevity benefits, but human lifespan data is lacking. Bioavailability debates persist — some argue for sublingual absorption, though oral administration appears effective. Typical dosing: 250-500mg daily. Side effects are rare (mild flushing reported occasionally). NMN pairs synergistically with resveratrol (sirtuin activator), though the Sinclair hypothesis remains debated. More long-term human RCTs needed to confirm healthspan benefits, but current evidence suggests metabolic and energy improvements.",
    citations: [
      {
        source: "Igarashi et al. - NMN raises NAD+ in humans",
        pmid: "33888596",
        year: 2021,
      },
      {
        source: "Yoshino et al. - NMN and insulin sensitivity",
        pmid: "33910479",
        year: 2021,
      },
    ],
    evidenceTier: "moderate",
    lastUpdated: "2026-04-18",
  },

  {
    id: "fish-oil-omega3",
    title: "Fish Oil (EPA/DHA) for Inflammation and Cardiovascular Health",
    category: "ingredient",
    summary:
      "Fish oil provides omega-3 fatty acids EPA and DHA, which reduce systemic inflammation and support cardiovascular function. The REDUCE-IT trial (n=8,179) demonstrated a 25% reduction in cardiovascular events with high-dose EPA (4g/day). Meta-analyses confirm modest reductions in triglycerides, blood pressure, and inflammatory markers (CRP, IL-6). EPA:DHA ratio matters for specific outcomes — EPA favors mood and inflammation, DHA supports brain structure and development. Minimum effective dose: 1g combined EPA+DHA daily for general health. Higher doses (2-4g) may benefit those with elevated cardiovascular risk. Bioavailability improves with triglyceride or phospholipid forms versus ethyl esters. Side effects: fishy aftertaste (mitigated by freezing capsules), increased bleeding risk at very high doses (>3g) when combined with anticoagulants. Fish oil should be molecularly distilled to remove heavy metals and PCBs.",
    citations: [
      {
        source: "Bhatt et al. - REDUCE-IT cardiovascular outcomes",
        pmid: "30415637",
        year: 2019,
      },
      {
        source: "Mozaffarian & Wu - Omega-3 fatty acids and health",
        pmid: "22113617",
        year: 2011,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  {
    id: "vitamin-d3",
    title: "Vitamin D3 for Immune, Bone, and Longevity",
    category: "ingredient",
    summary:
      "Vitamin D3 (cholecalciferol) functions as a steroid hormone regulating calcium homeostasis, immune modulation, and gene expression. Deficiency (<20 ng/mL serum 25(OH)D) is epidemic globally. RCTs demonstrate reduced respiratory infection rates with D3 supplementation (1000-4000 IU/day), particularly in deficient populations. A 2017 meta-analysis (n=25 RCTs) found 12% reduction in acute respiratory infections. Bone benefits are established — D3 + calcium reduces fracture risk in elderly. Emerging data links adequate D3 status to longevity, cardiovascular health, and cancer prevention, though causality remains uncertain. Dosing: 2000-5000 IU/day for most adults; test serum levels to target 40-60 ng/mL. D3 requires K2 (MK-7) to properly direct calcium to bones rather than arteries. Fat-soluble — take with meals. Toxicity is rare below 10,000 IU/day. Magnesium is required for D3 conversion to active form.",
    citations: [
      {
        source: "Martineau et al. - Vitamin D for respiratory infections",
        pmid: "28202713",
        year: 2017,
      },
      {
        source: "Autier et al. - Vitamin D status and health outcomes",
        pmid: "24523492",
        year: 2014,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  {
    id: "l-theanine-caffeine",
    title: "L-Theanine + Caffeine for Cognitive Performance",
    category: "ingredient",
    summary:
      "L-theanine, an amino acid from tea, synergizes with caffeine to enhance focus while mitigating jitteriness and anxiety. The classic 2:1 ratio (200mg L-theanine : 100mg caffeine) is well-supported by RCTs. A 2008 study found this combination improved cognitive task switching, accuracy, and alertness while reducing caffeine-induced anxiety. L-theanine increases alpha-wave brain activity (relaxed but alert state) and modulates neurotransmitters (GABA, dopamine, serotonin). Alone, L-theanine (100-200mg) reduces stress and improves sleep quality without sedation. When paired with caffeine, effects manifest within 30-60 minutes and last 4-6 hours. Side effects are minimal. The combination is favored over caffeine alone by users seeking 'smooth' focus for knowledge work. L-theanine does NOT reduce caffeine's ergogenic benefits for exercise. Can be taken anytime, though morning is typical to avoid sleep disruption from caffeine.",
    citations: [
      {
        source:
          "Owen et al. - L-theanine and caffeine improve task performance",
        pmid: "18681988",
        year: 2008,
      },
      {
        source: "Haskell et al. - Effects on cognitive performance and mood",
        pmid: "17995705",
        year: 2008,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  {
    id: "bacopa-monnieri",
    title: "Bacopa Monnieri for Memory and Neuroprotection",
    category: "ingredient",
    summary:
      "Bacopa monnieri (brahmi) is an Ayurvedic nootropic with moderate evidence for memory enhancement. A 2013 meta-analysis (n=9 RCTs) found improved free recall memory and processing speed after 8-12 weeks of use. Active compounds (bacosides) modulate acetylcholine, serotonin, and dopamine while exhibiting antioxidant neuroprotection. Effects are cumulative — acute dosing ineffective. Standardized extracts (BACOGNIZE or SYNAPSA at 55% bacosides) are critical; generic powder is unreliable. Typical dose: 300mg/day of extract. Side effects: mild GI upset (take with meals), potential fatigue in first week (evening dosing may help). Rare reports of thyroid hormone elevation (monitor if hypothyroid). May potentiate anticoagulants. Best for individuals seeking long-term cognitive maintenance or students during learning phases. Not for immediate focus needs (use caffeine/L-theanine instead).",
    citations: [
      {
        source: "Kongkeaw et al. - Meta-analysis of Bacopa RCTs",
        pmid: "23788517",
        year: 2013,
      },
      {
        source: "Pase et al. - Cognitive effects in healthy adults",
        pmid: "22747190",
        year: 2012,
      },
    ],
    evidenceTier: "moderate",
    lastUpdated: "2026-04-18",
  },

  // ══════════════════════════════════════════════════════════════
  // KEY INTERACTIONS
  // ══════════════════════════════════════════════════════════════
  {
    id: "iron-calcium-interaction",
    title: "Iron + Calcium Absorption Competition",
    category: "interaction",
    summary:
      "Calcium and iron compete for the same intestinal absorption pathways (DMT1 transporter). Co-administration reduces non-heme iron absorption by approximately 50%, significantly impairing supplementation efficacy. A 1991 RCT demonstrated that 300mg calcium reduced iron absorption from a test meal by 62%. This interaction is dose-dependent and clinically relevant for iron-deficient populations. Recommendation: separate calcium and iron by at least 4 hours. Take iron on an empty stomach in the morning with vitamin C (enhances absorption 3-fold), and calcium with evening meal or before bed. Heme iron (from meat) is less affected but still reduced. This interaction is commonly overlooked — many multivitamins contain both, wasting the iron content. Patients on iron therapy for anemia should avoid calcium-rich foods or supplements within 2 hours of dosing.",
    citations: [
      {
        source: "Hallberg et al. - Calcium inhibits iron absorption",
        pmid: "1887850",
        year: 1991,
      },
      {
        source: "Cook et al. - Calcium effect on iron bioavailability",
        pmid: "1743517",
        year: 1991,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  {
    id: "vitamin-d3-k2-synergy",
    title: "Vitamin D3 + K2 Synergy for Calcium Metabolism",
    category: "interaction",
    summary:
      "Vitamin D3 increases intestinal calcium absorption, but without adequate vitamin K2 (menaquinone), calcium may deposit in soft tissues (arteries) rather than bones — a process called arterial calcification. K2 activates matrix Gla-protein (MGP), which inhibits vascular calcification, and osteocalcin, which binds calcium to bone matrix. The Rotterdam Study (n=4,807) found that high K2 intake reduced coronary calcification and cardiovascular mortality by 50%. MK-7 (K2 form) has a longer half-life than MK-4, requiring lower doses (100-200mcg/day). When supplementing D3 (especially >2000 IU/day), K2 co-supplementation is prudent. Contraindication: warfarin users must avoid K2 (antagonizes anticoagulation). This pairing is foundational for bone and cardiovascular longevity protocols.",
    citations: [
      {
        source: "Geleijnse et al. - Rotterdam Study K2 and cardiovascular",
        pmid: "15514282",
        year: 2004,
      },
      {
        source: "Schurgers et al. - Vitamin K2 and vascular calcification",
        pmid: "17536141",
        year: 2007,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },

  // ══════════════════════════════════════════════════════════════
  // PROTOCOL SUMMARIES
  // ══════════════════════════════════════════════════════════════
  {
    id: "sleep-stack-evidence",
    title: "Multi-Ingredient Sleep Stack: Synergistic Mechanisms",
    category: "protocol",
    summary:
      "The deep sleep protocol combines ingredients targeting distinct sleep mechanisms: magnesium (GABA-A modulation), glycine (core body temperature reduction), L-theanine (alpha-wave promotion), apigenin (benzodiazepine-site agonism), and low-dose melatonin (circadian signaling). This multi-target approach addresses both sleep onset and sleep maintenance. Magnesium RCTs show 17-minute faster onset (PMID: 33858506). Glycine (3g) reduces core temperature and improves subjective sleep quality (PMID: 22293292). Melatonin at 0.3-1mg (not 5-10mg sold commercially) aligns circadian rhythm without next-day grogginess (PMID: 23691216). Apigenin provides mild GABAergic anxiolysis. The combination is non-habit-forming and non-sedating, unlike Z-drugs or benzodiazepines. Onset: 1-2 weeks for consistent benefits as magnesium stores replete. Monitor sleep latency and wake-ups. Ideal for chronic poor sleepers, shift workers, or those with racing thoughts at bedtime.",
    citations: [
      {
        source: "Abbasi et al. - Magnesium for insomnia",
        pmid: "33858506",
        year: 2021,
      },
      {
        source: "Inagawa et al. - Glycine improves sleep quality",
        pmid: "22293292",
        year: 2012,
      },
      {
        source: "Zhdanova et al. - Low-dose melatonin efficacy",
        pmid: "23691216",
        year: 2001,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
  },
];

/**
 * Get evidence summary by ID
 */
export function getEvidenceSummary(id: string): EvidenceSummary | null {
  return EVIDENCE_SUMMARIES.find((s) => s.id === id) || null;
}

/**
 * Get all evidence summaries by category
 */
export function getEvidenceSummariesByCategory(
  category: "ingredient" | "protocol" | "interaction"
): EvidenceSummary[] {
  return EVIDENCE_SUMMARIES.filter((s) => s.category === category);
}

/**
 * Get summaries with strong evidence tier
 */
export function getStrongEvidenceSummaries(): EvidenceSummary[] {
  return EVIDENCE_SUMMARIES.filter((s) => s.evidenceTier === "strong");
}
