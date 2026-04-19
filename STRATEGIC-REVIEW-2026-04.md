# Strategic Review — Vyvata

**Date:** 2026-04-19
**Scope:** Review of the Vyvata codebase and VSF roadmap; identification of strengths, risks, and a focused 4-6 week plan to ship a credible v0 of the scoring system.

---

## Executive summary

Vyvata as built is substantially different from the "audit your stack and get a receipt" concept this project originally spun out of. The current direction — **VSF (Vyvata Standards Framework), a six-dimension 0-100 integrity score for supplement products, delivered through a protocol generator and a B2B practitioner portal** — is a more ambitious, more defensible, and more crowded business than the original. It is also a 2-3 year build, not a 10-week build.

This document lays out:

1. What VSF actually is, in plain terms
2. Where the real strengths are
3. Where the real risks are
4. Four "edges" that could strengthen VSF without expanding scope
5. A concrete 4-6 week plan that ships a credible, limited-scope v0 of the full vision

---

## 1. What VSF actually is

Not "another premium wellness app." Not "another Ritual competitor." The attempt is to be **the Consumer Reports / JD Power of supplement products** — a trusted third-party scoring authority that practitioners and consumers use to choose what to take.

The moat is the scoring, not the UI. Everything else — the protocol generator, the practitioner dashboard, the vendor portal, the Standards Board — exists to distribute and legitimize the scores.

### Six-dimension scoring system

| Dimension | Weight | Status |
|---|---|---|
| Evidence Quality | 25% | ~40% built (40 summaries, PubMed-cited) |
| Formulation Integrity | 20% | Planned (forms, dose validation) |
| Manufacturing & Purity | 20% | Planned (GMP, COAs, contaminants) |
| Safety Profile | 15% | ~30% built (interactions, severity) |
| Brand Transparency | 12% | Not started |
| Sustainability & Ethics | 8% | Not started |

### Tier system

- **0-59:** Rejected
- **60-74:** Standard
- **75-89:** Verified
- **90-100:** Elite

### Distribution layers

- **B2C:** protocol generator with tier badges on recommended products
- **B2B:** practitioner dashboard with VSF-backed product recommendations
- **Vendor portal:** brands submit products for scoring (planned)
- **Public scorecards:** shareable URLs per product (planned Phase 4)

---

## 2. What's genuinely strong

**The positioning is differentiated.** Nobody currently owns "trusted third-party product integrity score that practitioners actually use." ConsumerLab is paywalled and narrow. Labdoor lost credibility. Examine does synthesis, not product rating. NSF and USP certify but don't compare or tier. There is a real gap.

**The B2B unit economics work.** Each practitioner onboarded brings N patients. A practitioner who needs to justify "why this specific Thorne product over the Amazon generic" has real value delivered by a cited VSF score. This is a flywheel — each practitioner's protocols become distribution for the scoring system.

**Existing foundation is substantial.** 152 ingredients with forms, interactions, synergies, cycling, and severity classification. 40 evidence summaries with PubMed citations. 5 protocol templates (cognitive, sleep, athletic, longevity, immune). Product abstraction layer started. Full practitioner auth, admin approval, dashboard.

**Claude fallback is smart.** The deterministic synthesizer means the core product works even when LLM costs are a constraint. Most startups in this space fail to ship when their API key runs out. This architectural choice buys operational flexibility.

---

## 3. Where the real risks are

### 3.1 Timeline optimism

Seventy-plus weeks of roadmapped work is realistically 2-3 years for one to two people. Standards Board recruitment alone (6-8 credentialed independent experts, governance charter, quarterly reviews, public minutes) is months of relationship work that doesn't speed up with more code.

**Mitigation:** Ship a credible 3-dimension v0 in 6 weeks instead of planning 6-dimension v1.0 over 70+ weeks.

### 3.2 Credibility paradox

Consumer Reports earned trust over decades by refusing advertising. VSF has a vendor portal where brands submit products. The incentive optics must be handled carefully:

- Is vendor submission free? If paid, it's pay-to-play.
- Do you score brands that *don't* submit? If not, big brands can opt out of being rated badly.
- Do you publicly reject products? If rejection is soft (no badge), the system has no teeth. If loud, legal threats follow.

US News & World Report has this exact problem with college rankings and it shapes everything they publish. This is a governance question, not a code question, and it should be decided before the vendor portal is built.

### 3.3 Six dimensions is probably too many

Sustainability/ethics (8%) feels present because it sounds good, not because it drives practitioner or consumer decisions. It risks making the system feel like ESG-lite rather than clinically rigorous.

**Recommendation:** Cut to 4-5 dimensions and concentrate weight on what actually differentiates products. Every extra dimension is another pipeline to maintain, another audit trail, another reason the score can be challenged.

### 3.4 Product abstraction bottleneck

You have 152 ingredients. You need hundreds of *products* — brand + name + specific ingredient/dose/form combinations + certifications + price. DSLD gets you the ingredient/dose/form data for free. Certifications, testing transparency, and claims verification are manual.

The VSF roadmap front-loads months of data work before any dimension beyond Evidence and Safety is meaningfully scored. Scope this honestly: 100 scored products is a realistic 4-week target with one dev + curator contractor. 500 is a quarter.

### 3.5 Acquisition loop is undefined

VSF is a back-end moat. The protocol generator is table stakes. Neither creates natural virality.

The practitioner patient-invite link (flagged in `docs/USER-FLOWS.md` as "very high value") is a real B2B loop. But **B2C has no equivalent acquisition mechanism**. Worth solving before any meaningful ad spend.

---

## 4. Four edges that strengthen VSF without expanding scope

The original "StackReceipts" concept had a sharp edge — the only confrontational voice in wellness — that was lost in the pivot to Vyvata. But the underlying data assets and architectural decisions that enabled that voice can still improve VSF without requiring a tonal reset back to "receipt" branding.

### Edge 1: FDA compliance data layer (highest leverage)

**What:** Ingest FDA warning letters, recalls, and CAERS adverse-event signals via openFDA and scrape the FDA Warning Letters index. Match to brands and products. Surface on product scorecards and practitioner dashboards.

**Why it's the highest-leverage edge:**

- **Feeds VSF directly.** Warning letters → Transparency dimension. Recalls → Safety dimension. Adverse-event signals → Safety sub-score.
- **Auto-populating.** No vendor submission needed. No expert review needed. Data flows from US government APIs continuously.
- **Uncontested.** No competitor surfaces FDA action against supplement brands in a clean UI. ConsumerLab doesn't. Thorne doesn't. Function doesn't.
- **Cheap.** Two weeks of pipeline work plus ongoing cron cost near zero.
- **Free and legal.** Federal works are public domain (17 USC §105); official APIs are explicitly authorized access.

**Strategic framing:** "The only protocol platform that tells practitioners which brands the FDA has actually taken action against."

See `docs/COMPLIANCE-PIPELINE-PLAN.md` for the full implementation prompt.

### Edge 2: Living protocols

**What:** Protocols that update when the underlying VSF score changes. If Thorne's magnesium glycinate drops from 88 → 65 because of an FDA warning letter, every practitioner with patients on that product gets an in-dashboard diff notification and a one-click alternative suggestion.

**Why:** This is a retention mechanism nobody else can offer. Static PDFs from functional medicine practitioners are the norm. A protocol that actively monitors its own constituents is categorically different.

**Dependency:** Edge 1 must be live first — no scoring changes without the data pipeline.

### Edge 3: Messy-input ingestion for practitioners

**What:** Photo of 14 bottles on a counter. Amazon order CSV. Screenshot of a patient's text message. Whatever the patient actually sends the practitioner.

**Why:** The clean text-paste flow is a fantasy for how practitioners actually receive patient data. Building a photo-first ingestion path (GPT-4o vision + DSLD product matching) is a workflow nobody else offers.

**Effort:** 2-3 weeks. Vision API budget is already designed into the architecture.

### Edge 4: Outcomes correlation (long-term moat)

**What:** T+30 / T+90 follow-up email to every audit. One question: did it help? Aggregate across all users who took comparable stacks for comparable goals.

**Why:** The true moat. "People who took magnesium glycinate 400mg + L-theanine 200mg for sleep reported X% improvement at 30 days" is a dataset no supplement brand can build (they only sell one SKU). No evidence database can build it (they only have studies). A neutral third-party with practitioner-gated patient data at scale is genuinely unique.

**Effort:** Infrastructure is easy. Getting the data volume is a 12-month patient-base problem.

---

## 5. The acquisition loop gap

VSF has no natural B2C virality mechanism. This is solvable now without waiting for Phase 4:

**Ship public product scorecards immediately, even at 2-3 dimension coverage.**

URLs like `/score/thorne-basic-nutrients-2-per-day` — rendered server-side, SEO-indexed, with tier badge, dimension breakdown, evidence citations, compliance flags, and source links. Brands that score well will voluntarily link to their scorecard as a marketing asset. Practitioners will share scorecards with patients. "Check your supplement's VSF score" becomes a natural conversational reference.

Even incomplete scorecards — with "Manufacturing: not yet assessed" placeholders — are more useful than nothing. They anchor the brand's authority claim publicly.

This is a Phase 4 item in the existing roadmap. It should be a Phase 1 item.

---

## 6. Concrete 4-6 week plan

Ship a credible, limited-scope v0 of VSF. Deliberately narrow. Not the full six-dimension vision. A pragmatic slice that:

1. Makes the product ~30% more defensible immediately
2. Doesn't require vendor portal, expert review, or Standards Board
3. Gives both of you something concrete to point at when a practitioner asks "why should I trust this?"

### Week 1-2: FDA compliance pipeline

Execute `docs/COMPLIANCE-PIPELINE-PLAN.md`:

- openFDA recalls and CAERS adverse events (official APIs)
- FDA Warning Letters index scrape (the one non-API federal source)
- New `compliance_flags` table linked to `manufacturers` and `products`
- Cron schedule via `vercel.json`
- Admin review queue for low-confidence matches

**Output:** VSF Safety + Transparency dimensions auto-populate with authoritative data. Roughly 27% of VSF's total scoring surface lights up overnight.

### Week 3-4: Product abstraction expansion

Prioritize the 100 products practitioners most commonly recommend. Use DSLD for bulk ingredient/dose ingestion, manual curation for certifications.

- Extend existing `products` table records with Evidence scores calculated from ingredient-level evidence summaries
- Manually seed NSF / USP / Informed Sport certifications for top 30 brands (see `.agents/certification-integration-agent.md` for the plan)
- Score at least 100 products on 3 of 6 dimensions (Evidence, Safety, Transparency)

**Output:** Real product-level scoring data, even if incomplete across all dimensions.

### Week 5-6: Public scorecards v0

Build `/score/[slug]` as a server-rendered, SEO-indexed page:

- Tier badge (Rejected / Standard / Verified / Elite)
- Dimension breakdown with "not yet scored" placeholders where needed
- Evidence citations
- Compliance flags with source links
- "Request a re-score" CTA for brands
- Share buttons (Twitter, LinkedIn, email)
- Open Graph image per scorecard

**Output:** Acquisition loop. Brands can link to their score. Practitioners can share scores with patients. SEO surface grows with every scored product.

### Deferrals (explicit)

- Vendor portal (Phase 3)
- Expert review pipeline (Phase 3)
- Standards Board formation (Phase 5)
- Manufacturing dimension (Phase 2 — needs COAs and facility data)
- Sustainability dimension (consider cutting entirely)
- B2C magic link + protocol history (`docs/USER-FLOWS.md` Phase 3 candidate)
- Outcomes tracking (Phase 4)
- Living protocols / score-change notifications (Edge 2 — after compliance pipeline stabilizes)

These are not rejected, just not in the 6-week window. Shipping the above gives a credible v0 that justifies continued investment in the rest.

---

## 7. Decision framework

The friend-led VSF direction is legitimately ambitious and has real defensibility. It should not be abandoned. But it should be narrowed in scope and sequenced by data availability.

### What to keep

- VSF scoring system concept (product-level, tiered, cited)
- Practitioner B2B positioning
- Protocol generator as distribution mechanism
- Current brand system (Deep Blue + Teal, Montserrat + Inter, clean clinical aesthetic)
- Deterministic fallback for Claude
- Existing 152-ingredient database

### What to narrow

- Six dimensions → four dimensions (drop Sustainability outright; consider folding some Transparency into Safety)
- 70+ week roadmap → 6-week v0 + quarterly milestones after
- Vendor portal before real traffic → vendor portal only after brands explicitly ask
- Standards Board before product-market fit → Standards Board after 100+ scored products and actual practitioner usage

### What to add

- FDA compliance data layer (Edge 1) — fastest, highest-leverage, documented in `docs/COMPLIANCE-PIPELINE-PLAN.md`
- Public scorecards immediately (not Phase 4)
- B2C acquisition loop (partly solved by public scorecards)
- Consider messy-input (photo ingestion) as practitioner-specific differentiator after v0 ships

---

## 8. Next action

1. Read `docs/COMPLIANCE-PIPELINE-PLAN.md` — the build prompt for Edge 1.
2. Execute it (two weeks of agent-driven work).
3. Reassess after shipping. Use the result to decide whether to push hard on VSF Phase 2 (Formulation + Manufacturing dimensions) or pivot effort to the acquisition loop / public scorecards first.

---

*This review reflects analysis of the Vyvata codebase as of 2026-04-19. Assumptions should be revisited after Phase 2 UI wiring completes and after any decision on the vendor portal governance model.*
