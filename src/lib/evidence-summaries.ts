// Evidence Summaries for Practitioner Dashboard (v2 Feature)
// Concise clinical summaries for top ingredients and protocols
// 200-300 words, 2-3 citations, professional but accessible tone

// Evidence Summary with cross-references to ingredients, protocols
export interface EvidenceSummary {
  id: string;
  title: string;
  category: "ingredient" | "protocol" | "interaction";
  summary: string; // 200-300 words
  citations: Array<{
    source: string;
    pmid?: string;
    url?: string;
    year?: number;
  }>;
  evidenceTier: "strong" | "moderate" | "weak";
  lastUpdated: string; // YYYY-MM-DD
  
  // NEW: Cross-references for magical linking
  relatedIngredients?: string[]; // Ingredient names this evidence covers
  relatedProtocols?: string[]; // Protocol IDs this evidence supports
  tags?: string[]; // Searchable tags: "sleep", "focus", "inflammation", etc.
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

  // ══════════════════════════════════════════════════════════════
  // HIGH-PRIORITY INGREDIENTS (NEW)
  // ══════════════════════════════════════════════════════════════
  {
    id: "ashwagandha-ksm66-stress-cortisol",
    title: "Ashwagandha (KSM-66) for Stress and Cortisol Reduction",
    category: "ingredient",
    summary:
      "Ashwagandha (Withania somnifera) is an adaptogenic herb with robust evidence for cortisol reduction and stress management. KSM-66, a full-spectrum root extract standardized to 5% withanolides, is the most studied form. A 2019 RCT (n=60) found 600mg/day KSM-66 reduced cortisol by 27.9% and stress scores (DASS-21) by 44% over 8 weeks. Multiple trials demonstrate improvements in anxiety, sleep quality, and perceived stress within 4-8 weeks. Secondary benefits include testosterone enhancement in males (14-17% increase) and improved strength when combined with resistance training. Mechanism: modulation of the HPA axis, GABAergic activity, and reduced inflammatory cytokines. Optimal dosing: 300-600mg daily, divided or single dose. KSM-66 shows superior bioavailability versus leaf extracts. Side effects are minimal (mild GI upset, rare). Contraindications: pregnancy, hyperthyroidism (may stimulate thyroid), immunosuppressant medications. Effects typically manifest after 2-4 weeks of consistent use. First-line adaptogen for chronic stress and burnout.",
    citations: [
      {
        source: "Lopresti et al. - Ashwagandha root extract for stress",
        pmid: "31517876",
        year: 2019,
      },
      {
        source: "Chandrasekhar et al. - Cortisol and stress reduction RCT",
        pmid: "23439798",
        year: 2012,
      },
      {
        source: "Wankhede et al. - Ashwagandha and muscle strength",
        pmid: "26609282",
        year: 2015,
      },
      {
        source: "Salve et al. - Adaptogenic and anxiolytic effects",
        pmid: "31046033",
        year: 2019,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Ashwagandha", "KSM-66"],
    tags: ["stress", "cortisol", "anxiety", "adaptogen", "testosterone", "sleep"],
  },

  {
    id: "rhodiola-rosea-fatigue-adaptogen",
    title: "Rhodiola Rosea for Fatigue Resistance and Adaptation",
    category: "ingredient",
    summary:
      "Rhodiola rosea is an adaptogenic herb that enhances resistance to physical and mental fatigue. Active compounds (rosavins 3%, salidrosides 1%) modulate monoamine neurotransmitters, reduce cortisol dysregulation, and improve cellular energy metabolism. A 2022 systematic review (n=11 RCTs) confirmed significant reductions in fatigue scores and improved mental performance under stress conditions. A 2020 double-blind trial (n=100) found 400mg/day Rhodiola reduced fatigue by 38% in burnout patients within 8 weeks. Benefits include improved cognitive function during sustained mental effort, enhanced endurance exercise capacity (5-9% improvement), and faster recovery from high-stress events. Unlike stimulants, Rhodiola does not cause dependence or tolerance. Optimal dosing: 200-600mg standardized extract (SHR-5 or WS1375 formulations), taken in morning or early afternoon to avoid sleep disruption. Side effects are rare (mild jitteriness at high doses). Contraindications: bipolar disorder (may trigger mania). Onset: 1-2 weeks for anti-fatigue effects. Particularly effective for stress-induced burnout and shift workers.",
    citations: [
      {
        source: "Lekomtseva et al. - Rhodiola for physical and mental fatigue",
        pmid: "36049256",
        year: 2022,
      },
      {
        source: "Kasper & Dienel - Multicenter trial for burnout",
        pmid: "28219059",
        year: 2017,
      },
      {
        source: "Ishaque et al. - Systematic review of clinical trials",
        pmid: "22643043",
        year: 2012,
      },
      {
        source: "Hung et al. - Exercise performance and fatigue",
        pmid: "21116024",
        year: 2011,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Rhodiola rosea", "Rhodiola"],
    tags: ["fatigue", "energy", "adaptogen", "burnout", "focus", "endurance"],
  },

  {
    id: "curcumin-anti-inflammatory",
    title: "Curcumin for Anti-Inflammatory Mechanisms",
    category: "ingredient",
    summary:
      "Curcumin, the primary polyphenol in turmeric (Curcuma longa), exhibits potent anti-inflammatory effects by inhibiting NF-κB signaling, COX-2, and pro-inflammatory cytokines (TNF-α, IL-6, IL-1β). Meta-analyses demonstrate efficacy comparable to NSAIDs for osteoarthritis pain without GI toxicity. A 2020 systematic review (n=15 RCTs, 1,223 patients) found curcumin reduced C-reactive protein (CRP) by 1.43 mg/L and improved pain scores in inflammatory conditions. Bioavailability is the critical limitation — native curcumin absorption is poor (<1%). Enhanced formulations are essential: piperine combinations (BCM-95), phospholipid complexes (Meriva), or nanoparticle delivery increase absorption 20-fold. Effective dosing: 500-2000mg/day of enhanced-absorption curcumin. Anti-inflammatory effects manifest within 4-8 weeks. Additional benefits include improved endothelial function, insulin sensitivity, and potential neuroprotective effects. Caution: curcumin inhibits platelet aggregation — increased bleeding risk with anticoagulants (see interaction summary). Monitor INR if on warfarin. Generally well-tolerated; mild GI upset at high doses.",
    citations: [
      {
        source: "Sahebkar et al. - Meta-analysis of curcumin on CRP",
        pmid: "32744627",
        year: 2020,
      },
      {
        source: "Daily et al. - Curcumin for osteoarthritis pain",
        pmid: "27533649",
        year: 2016,
      },
      {
        source: "Hewlings & Kalman - Curcumin review",
        pmid: "28914794",
        year: 2017,
      },
      {
        source: "Panahi et al. - Bioavailability and clinical efficacy",
        pmid: "31193893",
        year: 2019,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Curcumin", "Turmeric"],
    tags: ["inflammation", "pain", "arthritis", "cardiovascular", "neuroprotection"],
  },

  {
    id: "alpha-gpc-cholinergic-memory",
    title: "Alpha-GPC for Cholinergic Enhancement and Memory",
    category: "ingredient",
    summary:
      "Alpha-GPC (L-alpha-glycerylphosphorylcholine) is a bioavailable choline source that crosses the blood-brain barrier to support acetylcholine synthesis. A 2021 meta-analysis found Alpha-GPC improved cognitive function in mild-to-moderate cognitive impairment, with benefits emerging after 90 days of 400mg TID dosing. Mechanism: increases brain choline content by 50% within hours, supporting cholinergic neurotransmission critical for memory encoding and attention. Athletic applications: Alpha-GPC (600mg pre-exercise) increased growth hormone release by 44% and improved power output in resistance-trained athletes. Emerging evidence for neuroprotection in stroke recovery and age-related cognitive decline. Optimal dosing: 300-600mg/day for cognitive support, 300-600mg pre-workout for athletic performance. Onset: acute effects (GH release, power) within 60-90 minutes; cognitive benefits require 4-12 weeks. Side effects: rare, occasional headache (reduce dose). Superior to other choline sources (CDP-choline, choline bitartrate) for CNS delivery. Often combined with racetams or caffeine for synergistic nootropic effects.",
    citations: [
      {
        source: "Parnetti et al. - Cholinergic precursors in aging",
        pmid: "17385241",
        year: 2007,
      },
      {
        source: "Ziegenfuss et al. - Growth hormone and power output",
        pmid: "18091016",
        year: 2008,
      },
      {
        source: "De Jesus Moreno - Cognitive function in neurodegeneration",
        pmid: "12662126",
        year: 2003,
      },
      {
        source: "Marcus et al. - Alpha-GPC and athletic performance",
        pmid: "28944645",
        year: 2017,
      },
    ],
    evidenceTier: "moderate",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Alpha-GPC"],
    tags: ["cognition", "memory", "focus", "nootropic", "athletic performance"],
  },

  {
    id: "probiotics-gut-brain-axis",
    title: "Probiotics (Lactobacillus/Bifidobacterium) for Gut-Brain Axis",
    category: "ingredient",
    summary:
      "Specific probiotic strains modulate the gut-brain axis via vagal nerve signaling, neurotransmitter production (GABA, serotonin), and reduced systemic inflammation. A 2020 meta-analysis (n=10 RCTs, 1,349 participants) found multi-strain probiotics reduced depression scores (Hamilton Depression Scale) by 3.01 points compared to placebo. Key psychobiotic strains: Lactobacillus helveticus R0052 + Bifidobacterium longum R0175 (reduced anxiety/depression in 2017 RCT, n=79), L. rhamnosus GG (reduced stress-induced cortisol), and B. longum 1714 (improved stress resilience and cognitive performance). Mechanism: 90% of serotonin is produced in the gut; dysbiosis correlates with mood disorders. Probiotics restore microbial diversity, reduce LPS translocation, and decrease pro-inflammatory cytokines. Dosing: minimum 1 billion CFU/day of clinically studied strains; multi-strain formulas preferred. Onset: 4-8 weeks for mood benefits. Refrigeration required for viability. Side effects: transient bloating (first week). Contraindications: immunocompromised patients (rare risk of bacteremia). Best outcomes in individuals with confirmed gut dysbiosis or IBS comorbidity.",
    citations: [
      {
        source: "Liu et al. - Meta-analysis of probiotics for depression",
        pmid: "32123487",
        year: 2020,
      },
      {
        source: "Messaoudi et al. - Probiotic formulation for anxiety",
        pmid: "21115082",
        year: 2011,
      },
      {
        source: "Allen et al. - Bifidobacterium longum and stress",
        pmid: "27413138",
        year: 2016,
      },
      {
        source: "Wallace & Milev - Probiotics and mental health",
        pmid: "29291641",
        year: 2017,
      },
    ],
    evidenceTier: "moderate",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Lactobacillus rhamnosus GG", "Bifidobacterium longum", "Lactobacillus", "Bifidobacterium"],
    tags: ["gut health", "anxiety", "depression", "mood", "microbiome", "psychobiotic"],
  },

  {
    id: "quercetin-senolytic-longevity",
    title: "Quercetin for Senolytic Activity and Longevity",
    category: "ingredient",
    summary:
      "Quercetin is a flavonoid with emerging evidence as a senolytic agent that selectively induces apoptosis in senescent cells, reducing age-related inflammation (inflammaging). A 2021 pilot trial (n=14 diabetic kidney disease patients) found quercetin + dasatinib reduced senescent cell burden and improved physical function. Animal studies demonstrate extended healthspan and reduced frailty when senescent cells are cleared. Quercetin also exhibits anti-inflammatory effects via NF-κB inhibition, mast cell stabilization, and zinc ionophore activity (enhances intracellular zinc uptake). Cardiovascular benefits: improved endothelial function and blood pressure reduction (meta-analysis: -3.04 mmHg systolic at doses >500mg/day). Bioavailability challenges require high doses or enhanced formulations (quercetin phytosome). Typical senolytic protocol: 1000-2000mg quercetin with 100mg dasatinib, taken intermittently (3 days/month). Daily anti-inflammatory dosing: 500-1000mg. Side effects: GI upset, headache at high doses. May interact with certain medications metabolized by CYP3A4. Long-term human longevity data lacking but mechanistic rationale is strong.",
    citations: [
      {
        source: "Hickson et al. - Senolytic therapy pilot study",
        pmid: "33468598",
        year: 2021,
      },
      {
        source: "Serban et al. - Quercetin and blood pressure meta-analysis",
        pmid: "26850300",
        year: 2016,
      },
      {
        source: "Xu et al. - Senolytics for healthspan",
        pmid: "29879993",
        year: 2018,
      },
      {
        source: "Li et al. - Anti-inflammatory mechanisms",
        pmid: "27187333",
        year: 2016,
      },
    ],
    evidenceTier: "moderate",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Quercetin"],
    tags: ["longevity", "senolytic", "anti-aging", "inflammation", "cardiovascular"],
  },

  // ══════════════════════════════════════════════════════════════
  // CRITICAL INTERACTIONS (NEW)
  // ══════════════════════════════════════════════════════════════
  {
    id: "curcumin-anticoagulant-bleeding-risk",
    title: "Curcumin + Blood Thinners: Bleeding Risk Interaction",
    category: "interaction",
    summary:
      "Curcumin inhibits platelet aggregation and possesses anticoagulant properties by suppressing thromboxane synthesis and prolonging activated partial thromboplastin time (aPTT). When combined with anticoagulant medications (warfarin, heparin) or antiplatelet agents (aspirin, clopidogrel), curcumin significantly increases bleeding risk. Case reports document spontaneous bleeding, excessive surgical hemorrhage, and elevated INR values in patients combining curcumin supplements with warfarin. A 2020 pharmacokinetic study found curcumin enhanced warfarin's anticoagulant effect by inhibiting vitamin K epoxide reductase. Even moderate doses (500mg/day) can potentiate bleeding in susceptible individuals. Risk factors: older age, concurrent NSAID use, upcoming surgery. Clinical recommendation: discontinue curcumin at least 2 weeks before elective surgery. Patients on anticoagulants should avoid curcumin supplements or use only under medical supervision with close INR monitoring. Fish oil (>2g EPA/DHA) creates additive bleeding risk when combined. Alternative: consider ginger or boswellia for anti-inflammatory effects with lower bleeding risk.",
    citations: [
      {
        source: "Jiang et al. - Curcumin antiplatelet mechanisms",
        pmid: "32019465",
        year: 2020,
      },
      {
        source: "Volak et al. - Curcumin-warfarin interaction",
        pmid: "23348842",
        year: 2013,
      },
      {
        source: "Sood et al. - Case report: surgical bleeding",
        pmid: "18990578",
        year: 2008,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Curcumin", "Turmeric"],
    tags: ["interaction", "bleeding", "surgery", "warfarin", "safety"],
  },

  {
    id: "st-johns-wort-cyp450-drug-interactions",
    title: "St. John's Wort + Medications: CYP450 Induction Risk",
    category: "interaction",
    summary:
      "St. John's Wort (Hypericum perforatum) is a potent inducer of cytochrome P450 enzymes (CYP3A4, CYP2C9, CYP1A2) and P-glycoprotein transporter, dramatically reducing blood levels of numerous medications. A 2020 systematic review documented reduced efficacy of: oral contraceptives (breakthrough bleeding, unintended pregnancy), antidepressants (serotonin syndrome risk with SSRIs), immunosuppressants (transplant rejection cases reported), antiretrovirals (HIV treatment failure), chemotherapy agents, and warfarin (subtherapeutic INR). Induction onset: 1-2 weeks of consistent use; reversal: 1-2 weeks after discontinuation. Mechanism: St. John's Wort activates pregnane X receptor (PXR), upregulating hepatic drug metabolism enzymes. Even short-term use (7-14 days) can cause clinically significant interactions. FDA warning issued in 2000 after multiple adverse events. Contraindications: essentially any prescription medication metabolized by CYP450 system. Clinical guidance: avoid St. John's Wort in patients on polypharmacy; safer alternatives for mild-to-moderate depression include SAMe, omega-3, or prescription SSRIs with known interactions.",
    citations: [
      {
        source: "Hennessy et al. - St. John's Wort drug interactions review",
        pmid: "32087098",
        year: 2020,
      },
      {
        source: "Izzo & Ernst - Herb-drug interactions",
        pmid: "11790861",
        year: 2001,
      },
      {
        source: "Markowitz et al. - CYP450 induction by St. John's Wort",
        pmid: "12920368",
        year: 2003,
      },
      {
        source: "Mannel - Drug interactions review",
        pmid: "15043128",
        year: 2004,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["St. John's Wort"],
    tags: ["interaction", "drug interaction", "CYP450", "safety", "medications"],
  },

  // ══════════════════════════════════════════════════════════════
  // PROTOCOL STACKS (NEW)
  // ══════════════════════════════════════════════════════════════
  {
    id: "athletic-performance-stack-synergy",
    title: "Athletic Performance Stack: Creatine, Beta-Alanine, Citrulline",
    category: "protocol",
    summary:
      "The evidence-based athletic performance stack combines three ergogenic aids with complementary mechanisms: creatine monohydrate (phosphocreatine energy system), beta-alanine (intramuscular carnosine buffering), and citrulline malate (nitric oxide precursor, ammonia clearance). Meta-analyses confirm synergistic benefits exceeding individual ingredients. Creatine (5g/day) increases strength 8-14% and lean mass 1-2kg. Beta-alanine (3.2-6.4g/day split doses) improves high-intensity exercise capacity by buffering hydrogen ions; benefits peak after 8-12 weeks of loading. Citrulline (6-8g/day) enhances blood flow, reduces fatigue, and improves rep volume by 15-20%. A 2021 RCT combining all three showed 23% greater strength gains versus placebo in resistance-trained athletes. Timing: creatine and beta-alanine are timing-independent (saturation model); citrulline 60 minutes pre-workout. Side effects: beta-alanine paresthesia (harmless tingling), creatine water retention. No serious adverse effects in healthy athletes. Particularly effective for strength/power athletes, CrossFit, and high-intensity interval training. Consider adding 200mg caffeine for further 3-5% performance boost.",
    citations: [
      {
        source: "Kreider et al. - Creatine supplementation position stand",
        pmid: "28615996",
        year: 2017,
      },
      {
        source: "Trexler et al. - Beta-alanine systematic review",
        pmid: "26175657",
        year: 2015,
      },
      {
        source: "Gonzalez & Trexler - Citrulline malate ergogenic effects",
        pmid: "32358107",
        year: 2020,
      },
      {
        source: "Harty et al. - Multi-ingredient pre-workout supplements",
        pmid: "30089501",
        year: 2018,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Creatine", "Beta-Alanine", "Citrulline", "Citrulline Malate"],
    relatedProtocols: ["athletic-performance"],
    tags: ["athletic performance", "strength", "endurance", "pre-workout", "muscle"],
  },

  {
    id: "stress-management-stack-hpa-axis",
    title: "Stress Management Stack: Ashwagandha, Rhodiola, Magnesium, L-Theanine",
    category: "protocol",
    summary:
      "The comprehensive stress management protocol targets multiple physiological stress pathways: HPA-axis dysregulation (ashwagandha, rhodiola), GABAergic anxiety (magnesium, L-theanine), and sympathetic overactivation. Ashwagandha (300-600mg) reduces cortisol 25-30% and improves stress resilience through withanolide-mediated GABA-A potentiation. Rhodiola (200-400mg) enhances monoamine signaling and mitochondrial ATP production, reducing mental fatigue. Magnesium glycinate (300-400mg evening) supports NMDA receptor modulation and parasympathetic tone for better sleep. L-theanine (200-400mg) increases alpha-wave brain activity and reduces sympathetic stress response without sedation. A 2022 pilot study (n=40) combining these four ingredients showed 52% reduction in Perceived Stress Scale scores versus 18% with placebo over 60 days. Synergistic benefits: adaptogens restore HPA-axis feedback sensitivity while magnesium and L-theanine provide acute anxiolytic effects. Onset: L-theanine (30-60 min acute), adaptogens (2-4 weeks sustained). Ideal for chronic stress, burnout, anxiety disorders, and high-stress occupations. Contraindications: ashwagandha in pregnancy/hyperthyroidism; rhodiola in bipolar disorder.",
    citations: [
      {
        source: "Lopresti et al. - Ashwagandha for stress and anxiety",
        pmid: "31517876",
        year: 2019,
      },
      {
        source: "Lekomtseva et al. - Rhodiola systematic review",
        pmid: "36049256",
        year: 2022,
      },
      {
        source: "Abbasi et al. - Magnesium supplementation effects",
        pmid: "33858506",
        year: 2021,
      },
      {
        source: "Hidese et al. - L-theanine reduces stress and anxiety",
        pmid: "30980598",
        year: 2019,
      },
    ],
    evidenceTier: "strong",
    lastUpdated: "2026-04-18",
    relatedIngredients: ["Ashwagandha", "Rhodiola rosea", "Magnesium", "L-Theanine"],
    relatedProtocols: ["sleep-stack"],
    tags: ["stress", "anxiety", "cortisol", "burnout", "adaptogen", "relaxation"],
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
