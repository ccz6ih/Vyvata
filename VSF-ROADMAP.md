# Vyvata Standards Framework - Implementation Roadmap

**Vision:** Build the industry's most trusted integrity scoring system for health optimization products  
**Current Progress:** ~15-20% (Evidence + Safety scoring foundations)  
**Target:** VSF v1.0 with 6-dimension scoring, vendor portal, and governance structure

---

## 🎯 Strategic Phases

### **Current State (April 2026)**

#### ✅ What We Have
- **Evidence Quality (25% dimension):** 40 summaries, PubMed citations, GRADE tiers
- **Safety Profile (15% dimension):** Interaction detection, safety scoring
- **Ingredients Database:** 452 ingredients with clinical data
- **Evidence Infrastructure:** Cross-referencing, helpers, scoring engine
- **Stack Analysis:** Working/wasting/fighting/missing logic
- **Protocol Generation:** AI synthesis with LLM

#### ❌ Major Gaps
- No formulation integrity scoring (bioavailability, dose validation)
- No product-level abstraction (only ingredients)
- No third-party certification ingestion
- No vendor management system
- No brand transparency tracking
- No sustainability/ethics dimension
- No public scorecards or governance

---

## Phase 1: Complete Scoring Foundation
**Timeline:** 8-12 weeks  
**Goal:** Get to 3/6 dimensions + product abstraction (→35-40% complete)

### 1.1 Formulation Integrity Module (Week 1-3)
**What:** Add bioavailability forms, dose validation, and formulation scoring

**Deliverables:**
- [ ] Extend `ingredients-db.ts` with bioavailable forms
  - Add `forms` field: `{ name: string, bioavailability: 'high' | 'medium' | 'low', notes: string }[]`
  - Example: Magnesium → [citrate (high), oxide (low), glycinate (high)]
- [ ] Create `src/lib/formulation-scoring.ts`
  - `validateDose(ingredient, dose, userGoals)` - Compare to clinical studies
  - `scoreBioavailability(ingredient, form)` - Score form quality
  - `detectProprietaryBlend(product)` - Flag hidden doses
  - `calculateFormulationScore(product)` → 0-100
- [ ] Update scoring engine to include formulation dimension
- [ ] Add formulation breakdown to StackScoreCard component

**Dependencies:** None (builds on existing ingredients-db)

**Success Criteria:**
- Can score magnesium citrate 400mg higher than magnesium oxide 200mg
- Detects underdosed ingredients (e.g., 50mg Rhodiola vs 400mg clinical dose)
- Formulation score integrates into overall integrity score

---

### 1.2 Product-Level Abstraction (Week 3-5)
**What:** Separate products from ingredients - many products contain same ingredients

**Deliverables:**
- [ ] Create `src/lib/products-db.ts`
  - Product schema: `{ id, brand, name, ingredients: ProductIngredient[], certifications[], price, url }`
  - ProductIngredient: `{ ingredientName, dose, unit, form, timing }`
- [ ] Seed initial products database (20-30 high-quality products)
  - Thorne, Life Extension, NOW Foods, Pure Encapsulations, Jarrow
  - Focus on common supplements: Magnesium, Vitamin D, Omega-3, Creatine
- [ ] Create `src/lib/product-scoring.ts`
  - `scoreProduct(productId)` - Calculate full integrity score for a product
  - Combines evidence + safety + formulation for product's specific ingredients/doses
- [ ] Build product comparison view (compare 2-3 magnesium products side-by-side)

**Dependencies:** Formulation scoring module

**Success Criteria:**
- Can compare "Thorne Magnesium Citrate" vs "NOW Magnesium Oxide"
- Each product has unique integrity score based on form + dose
- Stack analysis can recommend specific products, not just ingredients

---

### 1.3 Weighted Integrity Score (Week 5-6)
**What:** Combine 3 dimensions into single 0-100 score with tiers

**Deliverables:**
- [ ] Update `scoring-engine.ts` to calculate weighted total
  - Evidence: 40% (temp weight until other dimensions added)
  - Safety: 30%
  - Formulation: 30%
- [ ] Implement tier system
  - 0-59: Rejected (not recommended)
  - 60-74: Standard (acceptable)
  - 75-89: Verified (recommended)
  - 90-100: Elite (top pick)
- [ ] Create `IntegrityScoreCard.tsx` component
  - Shows overall score, grade, tier badge
  - Expandable breakdown of 3 dimensions
- [ ] Add integrity score to protocol results page

**Dependencies:** Formulation scoring, product abstraction

**Success Criteria:**
- Elite products outscore standard products meaningfully
- Tier thresholds feel defensible (documented methodology)
- Users can understand why Product A scored 85 vs Product B scored 68

---

### 1.4 Transparency Flags (Week 6-8)
**What:** Manual tracking of third-party certifications (precursor to API integration)

**Deliverables:**
- [ ] Add certification flags to products-db
  - `certifications: ('NSF Sport' | 'USP Verified' | 'Informed Sport' | 'BSCG' | 'GMP' | 'Organic')[]`
- [ ] Create certification badge components
  - Visual badges for each certification
  - Tooltip explaining what certification means
- [ ] Seed certifications for initial 20-30 products (manual research)
- [ ] Add +10-15pt bonus to formulation/safety scores for certified products
- [ ] Display badges in product cards and scorecards

**Dependencies:** Products database

**Success Criteria:**
- NSF-certified products visibly stand out
- Certification bonuses feel proportional (+15pts for USP is meaningful)
- Users can filter by certification status

---

## Phase 2: Third-Party Data Ingestion
**Timeline:** 12-16 weeks  
**Goal:** Automate certification tracking + add manufacturing dimension (→50-60% complete)

### 2.1 Certification Integration (Week 9-14)
**What:** Integrate NSF, USP, Informed Sport APIs/databases

**Deliverables:**
- [ ] Research API availability for each certification body
  - NSF API (likely proprietary - may need partnership)
  - USP API (check availability)
  - Informed Sport product registry (may be scrapable)
- [ ] Build certification sync system
  - `src/lib/integrations/nsf.ts` - Fetch NSF-certified products
  - `src/lib/integrations/usp.ts` - Fetch USP-verified products
  - Cron job to refresh weekly
- [ ] Match products to certifications automatically
  - Fuzzy name matching (handle brand variations)
  - Manual verification queue for ambiguous matches
- [ ] Add certification expiration tracking
  - Alert when certification lapses
  - Auto-downgrade product score if expired

**Dependencies:** None (standalone integration)

**Success Criteria:**
- Can auto-detect when "Thorne Magnesium Citrate" is NSF-certified
- Certifications refresh weekly without manual intervention
- Expiration tracking prevents outdated badges

---

### 2.2 Manufacturing & Purity Dimension (Week 15-20)
**What:** Add 4th scoring dimension - GMP, facility audits, batch testing

**Deliverables:**
- [ ] Create `src/lib/manufacturing-scoring.ts`
  - `scoreGMPCompliance(product)` - Check facility certifications
  - `scoreBatchTesting(product)` - Frequency and transparency
  - `scoreContaminantScreening(product)` - Heavy metals, microbials
  - `calculateManufacturingScore(product)` → 0-100
- [ ] Add manufacturing data to products-db
  - `manufacturing: { gmpCertified, facilityAudits, batchTestingFrequency, coa_url }`
- [ ] Update weighted integrity score
  - Evidence: 30%, Safety: 20%, Formulation: 25%, Manufacturing: 25%
- [ ] Build manufacturing breakdown section in scorecard

**Dependencies:** Certification integration (GMP data)

**Success Criteria:**
- Products with published COAs score higher
- Pharmaceutical-grade manufacturers stand out
- Manufacturing score feels as rigorous as evidence score

---

### 2.3 Brand Transparency Tracking (Week 21-24)
**What:** Add 5th dimension - claims verification, sourcing, transparency

**Deliverables:**
- [ ] Create `src/lib/brands-db.ts`
  - Brand schema: `{ id, name, transparencyScore, claimsViolations[], sourcingDisclosed, adverseEvents[] }`
- [ ] Build claims verification system
  - Parse product marketing copy
  - Flag unsupported claims ("cures diabetes" = instant rejection)
  - Cross-reference claims against evidence database
- [ ] Create `src/lib/transparency-scoring.ts`
  - `scoreClaimsAccuracy(brand, product)` - Verify marketing claims
  - `scoreSourcingTransparency(brand)` - Ingredient sourcing disclosed
  - `scoreAdverseEventHandling(brand)` - Response to safety issues
  - `calculateTransparencyScore(brand, product)` → 0-100
- [ ] Update weighted integrity score
  - Evidence: 25%, Safety: 20%, Formulation: 20%, Manufacturing: 20%, Transparency: 15%

**Dependencies:** Products database, evidence summaries

**Success Criteria:**
- Brands making false claims get flagged and scored lower
- Transparent brands (Thorne, Life Extension) score higher
- Claims verification feels objective and defensible

---

## Phase 3: Vendor Portal & Review Workflow
**Timeline:** 16-20 weeks  
**Goal:** Enable vendor submissions + expert review pipeline (→70-80% complete)

### 3.1 Vendor Portal (Week 25-32)
**What:** Allow brands to submit products for VSF scoring

**Deliverables:**
- [ ] Create vendor authentication system
  - Supabase table: `vendors` (email, company, verified)
  - Email verification flow
- [ ] Build vendor dashboard (`/vendor/dashboard`)
  - View submitted products
  - See scores and feedback
  - Upload COAs, certifications, studies
- [ ] Create product submission form
  - Ingredients list with doses and forms
  - Certifications upload (PDF)
  - Clinical studies upload (PDF)
  - Manufacturing facility details
- [ ] Build document parsing system
  - OCR for COAs (extract heavy metals, microbiologicals)
  - PDF text extraction for studies
  - Auto-populate product data where possible

**Dependencies:** None (new feature vertical)

**Success Criteria:**
- Vendor can register and submit product in <10 minutes
- 80% of data auto-extracted from uploaded documents
- Submission queue visible to admin

---

### 3.2 AI Pre-Screening (Week 33-38)
**What:** Automated first-pass scoring before human review

**Deliverables:**
- [ ] Build AI scoring pipeline
  - `src/lib/ai-prescreening.ts`
  - Parse ingredients → match to ingredients-db
  - Validate doses → compare to clinical studies
  - Check claims → cross-reference evidence
  - Flag disqualifiers (banned substances, unsupported claims)
- [ ] Create auto-rejection system
  - Products with banned substances → instant reject
  - Products with zero evidence for any ingredient → reject
  - Products with fraudulent claims → reject
  - Auto-email vendor with specific gaps
- [ ] Build pre-screening dashboard (`/admin/prescreening`)
  - View pending submissions
  - See AI scores and flags
  - Approve for expert review or reject

**Dependencies:** Vendor portal, evidence database

**Success Criteria:**
- AI catches 90% of clear rejections (banned substances, fraud)
- AI pre-score within ±10pts of final expert score
- Reduces expert review workload by 60%

---

### 3.3 Expert Review Pipeline (Week 39-44)
**What:** Human validation layer for nuanced scoring

**Deliverables:**
- [ ] Create expert reviewer roles
  - Supabase table: `reviewers` (name, credentials, categories[])
  - Categories: supplements, wearables, protocols, diagnostics
- [ ] Build expert review dashboard (`/expert/review`)
  - Assigned products queue
  - AI score + flags displayed
  - Override AI score with justification
  - Escalate to full board for edge cases
- [ ] Create review workflow
  - Auto-assign by category (supplement → dietitian)
  - Expert validates AI scores
  - Expert adds nuanced notes
  - Final score published with expert signature
- [ ] Build appeals system
  - Vendor can request re-review
  - Must provide new evidence
  - Different expert assigned for appeal

**Dependencies:** AI pre-screening

**Success Criteria:**
- Expert can review a product in <20 minutes
- Override justifications are documented and auditable
- Appeals feel fair and transparent

---

## Phase 4: Public Trust Layer
**Timeline:** 8-12 weeks  
**Goal:** Public scorecards + practitioner portal (→85-90% complete)

### 4.1 Public Product Scorecards (Week 45-50)
**What:** Transparency pages for every scored product

**Deliverables:**
- [ ] Create product scorecard page (`/products/[id]`)
  - Overall integrity score with tier badge
  - 6-dimension breakdown (evidence, safety, formulation, manufacturing, transparency, sustainability)
  - Evidence citations displayed
  - Certifications shown with badges
  - Score history over time (if re-scored)
- [ ] Add score history tracking
  - Log every score change with reason
  - Display timeline of score changes
  - "Last updated: [date]" timestamp
- [ ] Build product comparison tool
  - Compare 2-3 products side-by-side
  - Highlight differences in scores/certifications
  - Recommend best option for user's goals

**Dependencies:** All scoring dimensions complete

**Success Criteria:**
- Scorecard feels authoritative and credible
- Users can understand exactly why Product A > Product B
- Transparency builds trust in VSF methodology

---

### 4.2 Practitioner B2B Portal (Week 51-56)
**What:** VSF-backed product recommendations for clinicians

**Deliverables:**
- [ ] Create practitioner authentication
  - Verify credentials (license number, NPI)
  - Practitioner-only access tier
- [ ] Build practitioner dashboard (`/practitioner/products`)
  - Search products by VSF score
  - Filter by certification, category, patient goals
  - Export product recommendations as PDF
- [ ] Create patient protocol builder
  - Select patient goals
  - Get VSF-scored product recommendations
  - Generate protocol with specific products (not just ingredients)
  - Email or print for patient
- [ ] Add practitioner-specific insights
  - Dosing guidance for specific populations
  - Contraindication alerts
  - Drug interaction warnings

**Dependencies:** Public scorecards, product database

**Success Criteria:**
- Practitioner can build VSF-backed protocol in <5 minutes
- Protocol feels professional and credible for patient handout
- Practitioners trust VSF as their product reference

---

## Phase 5: Governance & Continuous Monitoring
**Timeline:** Ongoing (starts Week 57+)  
**Goal:** VSF v1.0 launch with full credibility infrastructure (→95-100% complete)

### 5.1 Standards Board Formation (Week 57-60)
**What:** Independent governance body for scoring methodology

**Deliverables:**
- [ ] Recruit Standards Board members
  - 2-3 functional medicine MDs
  - 1-2 PhD researchers (nutrition, pharmacology)
  - 1 registered dietitian
  - 1 consumer advocate (no commercial ties)
  - 1 biomedical engineer (for devices)
- [ ] Establish governance charter
  - Board authority over methodology changes
  - Quarterly review cadence
  - Public minutes published
  - Independence guarantee (no board member can have commercial relationship with scored brands)
- [ ] Document scoring methodology publicly
  - Full VSF methodology PDF published
  - Explain all weights, thresholds, calculations
  - Open for public comment

**Dependencies:** All scoring dimensions complete

**Success Criteria:**
- Board composition feels credible and independent
- Methodology documentation passes peer review
- Public trusts VSF is not pay-to-play

---

### 5.2 Continuous Monitoring System (Week 61-68)
**What:** Automated re-scoring triggers

**Deliverables:**
- [ ] Build PubMed monitoring
  - Weekly search for new studies on scored ingredients
  - Flag products that should be re-scored based on new evidence
  - Email expert reviewers with new studies
- [ ] Build certification monitoring
  - Check certification expiration dates
  - Auto-downgrade products with lapsed certifications
  - Alert vendor to renew
- [ ] Build adverse event monitoring
  - Scrape FDA MedWatch for adverse events
  - Match events to scored products
  - Trigger re-review if serious events reported
- [ ] Build reformulation detection
  - Monitor product label changes (via vendor notifications or web scraping)
  - Flag products for re-review if ingredients/doses change
  - Update score based on new formulation

**Dependencies:** All scoring dimensions, vendor portal

**Success Criteria:**
- Scores stay current with latest evidence
- No outdated certifications displayed
- Adverse events trigger immediate re-review

---

### 5.3 Sustainability & Ethics Dimension (Week 69-72)
**What:** Add 6th dimension to complete VSF v1.0

**Deliverables:**
- [ ] Create `src/lib/sustainability-scoring.ts`
  - `scoreIngredientSourcing(product)` - Sustainable vs exploitative
  - `scorePackaging(product)` - Plastic vs recyclable
  - `scoreLaborPractices(brand)` - Fair labor certifications
  - `scoreAnimalTesting(brand)` - Cruelty-free policy
  - `scoreCarbonFootprint(brand)` - Disclosed and mitigated
  - `calculateSustainabilityScore(product, brand)` → 0-100
- [ ] Add sustainability data to products-db and brands-db
- [ ] Update weighted integrity score to final VSF v1.0 weights
  - Evidence: 25%
  - Formulation: 20%
  - Manufacturing: 20%
  - Safety: 15%
  - Transparency: 12%
  - Sustainability: 8%
- [ ] Add sustainability section to public scorecards

**Dependencies:** All other dimensions complete

**Success Criteria:**
- Brands with sustainable practices score higher
- Dimension feels meaningful but not overweighted
- VSF v1.0 scoring system is complete

---

## 📊 Progress Tracking

| Phase | Dimensions Complete | % of VSF | Timeline | Status |
|-------|-------------------|---------|----------|--------|
| **Current** | Evidence, Safety | 15-20% | - | ✅ Complete |
| **Phase 1** | +Formulation | 35-40% | 8-12 weeks | 🎯 Next |
| **Phase 2** | +Manufacturing, +Transparency | 50-60% | 12-16 weeks | ⏸️ Planned |
| **Phase 3** | +Vendor workflow | 70-80% | 16-20 weeks | ⏸️ Planned |
| **Phase 4** | +Public trust | 85-90% | 8-12 weeks | ⏸️ Planned |
| **Phase 5** | +Sustainability, +Governance | 95-100% | Ongoing | ⏸️ Planned |

---

## 🎯 Success Metrics

### Phase 1 Milestones
- [ ] 30 products scored with formulation integrity dimension
- [ ] Formulation score differentiates high-quality vs low-quality products
- [ ] Product comparisons show meaningful score differences

### Phase 2 Milestones
- [ ] 100+ products with automated certification tracking
- [ ] Manufacturing dimension adds 20% to total score
- [ ] Brand transparency flags catch 90% of false claims

### Phase 3 Milestones
- [ ] 10 vendors registered and submitting products
- [ ] AI pre-screening auto-rejects 60% of low-quality submissions
- [ ] Expert review pipeline processes 20+ products/week

### Phase 4 Milestones
- [ ] 500+ products with public scorecards
- [ ] 50+ practitioners using B2B portal
- [ ] Practitioner protocols cite VSF scores as credibility marker

### Phase 5 Milestones
- [ ] Standards Board meets quarterly with public minutes
- [ ] Continuous monitoring triggers 10+ re-scores per month
- [ ] VSF v1.0 methodology published and peer-reviewed

---

## 🚀 Next Immediate Actions

1. **Start Phase 1.1** - Formulation Integrity Module (use agent)
2. **Run formulation-integrity agent** to extend ingredients-db with bioavailable forms
3. **Create formulation-scoring.ts** module
4. **Test formulation scoring** on 5-10 common supplements
5. **Integrate into existing scoring engine** and protocol results

---

## 📚 Related Documents
- `AGENTS.md` - Agent guidelines for VSF implementation
- `src/lib/scoring-engine.ts` - Current scoring system (Evidence + Safety)
- `src/lib/ingredients-db.ts` - 452 ingredients with clinical data
- `src/lib/evidence-summaries.ts` - 40 evidence summaries with PubMed citations

---

**Last Updated:** April 18, 2026  
**Next Review:** After Phase 1 completion
