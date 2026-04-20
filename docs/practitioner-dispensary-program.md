# Practitioner Dispensary Commission Program

**Revenue Model Rubric | Implementation Specification | Version 1.0 | April 2026 | Confidential**

---

## 1. Program Overview

The Vyvata Practitioner Dispensary Commission Program is a structured affiliate revenue layer targeted at licensed healthcare practitioners — MDs, functional medicine doctors, chiropractors, pharmacists, and naturopaths. It monetizes Vyvata's scoring infrastructure by enabling practitioners to earn elevated commissions when they recommend Vyvata-scored products to patients.

Vyvata does not hold or ship inventory. It operates exclusively as the scoring, attribution, and disbursement layer. Brands hold a single commercial agreement with Vyvata; Vyvata manages all downstream practitioner relationships.

> **🔴 CRITICAL**
> 
> **CORE PRINCIPLE:** Commission rates never influence recommendation ranking or product scoring. The dispensary program is a monetization layer built on top of the scoring infrastructure — never a factor within it. Ranking and scoring integrity is non-negotiable.

---

## 2. Eligibility Criteria

### 2A. Brand Eligibility — Dispensary Program Entry Gate

Not all brands listed on Vyvata qualify for the practitioner dispensary channel. The following conditions must all be satisfied before a product is dispensary-eligible:

| Requirement | Gate | Rationale |
|-------------|------|-----------|
| Minimum Vyvata Score | 75+ (Verified) | Standard-tier products (60–74) are excluded. Practitioners recommending low-scored products creates liability. |
| Brand Submission Completed | Required | AI Inference scores (Path A) do not qualify. Full Brand Submission (Path B) required to unlock dispensary status. |
| Active Affiliate Agreement with Vyvata | Required | Brand must have a signed commission agreement stipulating dispensary-tier rates and payout terms. |
| Practitioner Channel Opt-In | Brand Elected | Some brands may choose not to participate in the practitioner channel. Opt-in is voluntary. |
| No Active Auto-Fail Conditions | Verified Clean | Any active Auto-Fail flag (recall, deceptive claims, etc.) immediately suspends dispensary eligibility. |

### 2B. Practitioner Eligibility — Verification Requirements

Practitioners must complete a one-time verification process before earning dispensary commissions. Verification is gated by license status and agreement to FTC disclosure requirements.

| Practitioner Type | Verification Source | Notes |
|-------------------|---------------------|-------|
| MD / DO | NPI Registry lookup | Automated check against CMS NPI database. Active status required. |
| Functional Medicine Doctor | IFM credential or NPI | IFM Certified Practitioner database or MD/DO NPI fallback. |
| Chiropractor (DC) | State chiropractic board | Manual or API lookup depending on state board availability. |
| Pharmacist (RPh / PharmD) | NABP e-Profile ID | National Association of Boards of Pharmacy verification. |
| Naturopath (ND) | State ND board / AANP | Licensed NDs in regulated states. AANP membership as secondary signal. |

> **🔴 CRITICAL**
>
> **FTC DISCLOSURE REQUIREMENT:** All practitioner participants must agree, as a condition of enrollment, that any patient-facing communication recommending a product includes a clear statement that the practitioner may earn a commission through Vyvata. This is mandatory and non-waivable. Vyvata's own scoring rubric docks brands for undisclosed affiliate relationships — the program must hold practitioners to the same standard.

---

## 3. Attribution Mechanics

Two parallel attribution models operate simultaneously. Model A captures one-off recommendations; Model B captures ongoing patient panel relationships. Both must be implemented.

### 3A. Model A — Practitioner Referral Link / Code

| Element | Specification |
|---------|---------------|
| Unique Code Format | `VYVATA-{CREDENTIAL_TYPE}-{SURNAME}-{ID}` e.g. `VYVATA-DC-JONES-0042` |
| Link Generation | Auto-appended to all product scorecard links shared via the Patient Stack Builder tool. |
| Attribution Window | 30 days from first click. Cookie + server-side token. Last-click attribution. |
| Tracking | Server-side pixel fires on purchase confirmation. Stored against `practitioner_id` in commission ledger. |
| Best For | One-off recommendations. Patients who purchase quickly. Link-shared protocols. |

### 3B. Model B — Patient Account Linking

| Element | Specification |
|---------|---------------|
| Mechanism | Practitioner invites patient to create a Vyvata account via a practice-specific invite link. Patient account is permanently linked to practitioner `practice_id`. |
| Attribution Window | 180 days rolling from last practitioner-generated recommendation for that product category. |
| Qualifying Purchases | Any purchase of a practitioner-recommended product within the attribution window. Patient must purchase via Vyvata-tracked link. |
| Stacking Rule | If both Model A and Model B fire for the same purchase, Model B takes precedence (longer relationship, higher trust signal). |
| Best For | Ongoing patient relationships. Repeat purchasers. Practitioners with active patient panels. |

---

## 4. Commission Rate Structure

Practitioner dispensary rates are set above consumer affiliate rates to reflect the higher conversion quality and endorsement value of a licensed professional recommendation.

| Channel / Tier | Commission Rate | Vyvata Spread | Brand Pays Vyvata |
|----------------|-----------------|---------------|-------------------|
| Consumer Affiliate (baseline) | 8–12% | Retained by Vyvata | 8–12% |
| Practitioner Dispensary — Standard | 18–20% | ~7% | 25% |
| Practitioner Dispensary — Elite (Practitioner Elite subscribers, high volume) | 22–25% | ~5% | 28–30% |

> **ℹ️ NOTE**
>
> Vyvata collects the full agreed commission from the brand, then remits the practitioner share. The spread (difference) is Vyvata platform margin. Brands that want access to the high-intent practitioner channel pay a premium for it — this is also a strong commercial incentive for brands to complete the Brand Submission process and achieve Verified or Elite status.

---

## 5. Payment Mechanics

| Element | Specification |
|---------|---------------|
| Collection | Vyvata invoices the brand for the full agreed commission % on each confirmed sale. Net-30 payment terms standard. |
| Disbursement | Vyvata remits the practitioner share monthly via ACH / direct deposit. Minimum payout threshold: $50. Amounts below threshold roll to next month. |
| Commission Ledger | All transactions recorded in `commission_ledger` table: `practitioner_id`, `product_id`, `brand_id`, `sale_amount`, `commission_earned`, `commission_status` (pending / confirmed / paid), `attribution_model` (A or B). |
| Tax Reporting | Practitioners earning above IRS threshold receive a 1099-NEC annually. Practitioners provide W-9 at enrollment. Vyvata retains TIN for reporting. |
| Dispute Window | Practitioners may dispute commission records within 60 days of the statement date. Disputes reviewed within 14 business days. |
| Clawback Conditions | Commissions reversed on refunds, chargebacks, or confirmed FTC-violation purchases. 90-day hold before commissions move from pending to confirmed. |

---

## 6. Practitioner Dashboard — Feature Specification

The dispensary dashboard is a sub-module of the Practitioner Portal (available to Practitioner Pro and Elite subscribers). It provides full visibility into recommendation activity and commission earnings.

| Feature | Priority | Description |
|---------|----------|-------------|
| Commission Summary Widget | P0 | Shows: Pending, Confirmed, and Paid commissions for current and trailing 3 months. |
| Recommended Products List | P0 | All products currently in patient stacks linked to this practitioner, with attribution model, patient count, and current Vyvata score. |
| Score Alert Feed | P0 | Real-time alerts when a recommended product changes score tier (e.g. Verified drops to Standard). Practitioner must be informed before patient is. |
| Conversion Rate by Product | P1 | Click-throughs vs. confirmed purchases per product. Helps practitioners identify high-converting recommendations. |
| Patient Stack Builder | P1 | Build a custom product stack for a patient. Auto-generates a shareable link with Model A attribution code embedded. |
| Payout History + Download | P1 | Full ledger with export to CSV. Required for practitioner tax records. |
| FTC Disclosure Status | P0 | Shows current disclosure agreement status. Blocks commission earning if disclosure agreement has expired or been revoked. |

---

## 7. Developer Implementation Specification

The dispensary program requires six distinct build areas. Each is scoped below with data models, API endpoints, and implementation notes aligned with the existing Vyvata scoring engine architecture.

### Step 1 — Database Schema Extensions

Add the following tables to the existing Vyvata database. These are net-new tables that do not modify existing scoring engine tables.

| Table | Key Fields | Notes |
|-------|------------|-------|
| `practitioners` | `practitioner_id`, `npi`, `license_type`, `license_state`, `license_number`, `verified_at`, `ftc_agreed_at`, `tier` (standard\|elite), `status` (pending\|active\|suspended) | Core practitioner identity table. `verified_at` populated by license verification job. `status` gated by FTC agreement. |
| `practitioner_codes` | `code_id`, `practitioner_id`, `code_string`, `created_at`, `is_active` | One-to-many. Each practitioner may have multiple codes (e.g. per product category). Only one active code at a time per practitioner. |
| `patient_practitioner_links` | `link_id`, `patient_user_id`, `practitioner_id`, `linked_at`, `status` | Model B relationship table. `patient_user_id` references existing users table. Status: active\|revoked. Patient can revoke link from their account settings. |
| `commission_agreements` | `agreement_id`, `brand_id`, `consumer_rate`, `practitioner_rate`, `elite_rate`, `effective_date`, `status` | Brand-level rate configuration. `brand_id` references existing brands table. Status: active\|paused\|terminated. |
| `commission_ledger` | `ledger_id`, `practitioner_id`, `product_id`, `brand_id`, `order_id`, `sale_amount`, `gross_commission`, `practitioner_share`, `vyvata_share`, `attribution_model` (A\|B), `status` (pending\|confirmed\|paid\|reversed), `created_at`, `paid_at` | Immutable append-only ledger. Never update — only insert reversals as new rows with negative amounts. |
| `dispensary_eligible_products` | `product_id`, `is_eligible`, `eligibility_checked_at`, `score_at_check`, `fail_reason` | Materialised eligibility cache. Re-evaluated by cron job on every score change. Saves re-checking eligibility on every page load. |

### Step 2 — License Verification Service

A background verification service that checks practitioner license status against external registries at enrollment and re-checks quarterly.

| Task | Implementation Detail |
|------|----------------------|
| NPI Lookup (MDs) | POST to `https://npiregistry.cms.hhs.gov/api` — free public API. Match on `npi` field + taxonomy code. Return: `enumeration_type`, `basic.status`. Active status required. |
| Chiropractor Lookup | No national API available. Implement manual upload flow: practitioner uploads license PDF. Admin queue for human review. Flag for automation as state APIs become available. |
| Pharmacist Lookup | NABP e-Profile: `https://nabp.pharmacy/programs/e-profile-id` — practitioner provides their e-Profile ID. Verify via NABP verification page. Automate with headless browser if NABP does not expose an API. |
| Naturopath Lookup | No national registry. Check state ND licensing boards for regulated states (CT, WA, OR, etc.). Unregulated states: require AANP membership ID as secondary signal. Human review queue fallback. |
| Re-verification Schedule | Cron job runs quarterly. Any practitioner whose license check fails is moved to `status=suspended`. Commission earning halted. Email notification sent with 30-day appeal window. |
| Endpoints to Build | `POST /api/v1/practitioners/apply` \| `GET /api/v1/practitioners/{id}/status` \| `POST /api/v1/practitioners/{id}/verify` \| `GET /api/v1/practitioners/{id}/verification-status` |

### Step 3 — Attribution Tracking System

Implements Model A (referral codes) and Model B (patient account linking). Both must be running in production simultaneously.

| Task | Implementation Detail |
|------|----------------------|
| Model A — Code Generation | On practitioner approval: auto-generate unique code string. Store in `practitioner_codes`. Format: `VYVATA-{TYPE}-{SURNAME_SLUG}-{ZERO_PADDED_ID}`. Append as URL param `?ref={code}` to all Patient Stack Builder share links. |
| Model A — Click Capture | On page load: parse `ref` param from URL. If valid code found in `practitioner_codes`, write to server-side session store with 30-day TTL. Set first-party cookie as fallback. Do not rely on third-party cookies. |
| Model A — Purchase Attribution | At order confirmation: check session store and cookie for `ref`. If found and within 30-day window: write ledger entry with `attribution_model='A'`. Clear session token after attribution. |
| Model B — Patient Invite | Practitioner generates invite link from dashboard: `GET /api/v1/practitioners/{id}/patient-invite-link`. Returns a JWT-signed URL with `practitioner_id` embedded. URL expires in 7 days. On patient account creation via invite link: write `patient_practitioner_links` record. |
| Model B — Purchase Attribution | At order confirmation: check `patient_practitioner_links` for active link. If found AND product is in practitioner's recommended stack for this patient AND within 180-day window: write ledger entry with `attribution_model='B'`. Model B takes precedence over Model A if both fire. |
| Conflict Resolution | Model B > Model A. Consumer affiliate > no attribution. A single purchase generates at most one commission ledger entry. |
| New Endpoints | `POST /api/v1/attribution/capture` \| `POST /api/v1/attribution/confirm` \| `POST /api/v1/practitioners/{id}/patient-invite` \| `DELETE /api/v1/patient-links/{link_id}` (patient revoke) |

### Step 4 — Commission Calculation Engine

A server-side service that fires on every purchase confirmation event, determines applicable rate, and writes to the commission ledger.

| Task | Implementation Detail |
|------|----------------------|
| Rate Lookup | On purchase event: fetch `commission_agreements` record for `brand_id`. Check practitioner tier (standard vs elite). Apply `practitioner_rate` or `elite_rate` accordingly. |
| Split Calculation | `gross_commission = sale_amount * brand_rate`. `practitioner_share = gross_commission * (practitioner_rate / brand_rate)`. `vyvata_share = gross_commission - practitioner_share`. All amounts stored as integers in cents (USD) to avoid floating point errors. |
| Eligibility Check | Before writing ledger entry: confirm product is in `dispensary_eligible_products` with `is_eligible=true` at time of purchase. If product became ineligible after recommendation but before purchase, do not write commission. Log the blocked event for audit. |
| Pending → Confirmed | Commission is written as `status=pending`. Cron job runs nightly: move pending commissions older than 90 days with no associated refund/chargeback to `status=confirmed`. |
| Reversal Logic | On refund/chargeback webhook from payment processor: write a new ledger row with negative amounts (do not update original row). Set original row `status=reversed`. Recalculate pending balance for practitioner. |
| New Endpoints | `POST /api/v1/commissions/calculate` (internal, called by order service) \| `GET /api/v1/practitioners/{id}/commissions?status=pending\|confirmed\|paid` \| `POST /api/v1/commissions/reverse` (called by refund webhook) |

### Step 5 — Payout Service

Handles monthly disbursement of confirmed commissions to practitioners via ACH.

| Task | Implementation Detail |
|------|----------------------|
| Payment Processor | Use Stripe Connect (recommended) or Trolley for mass practitioner payouts. Both support 1099-NEC generation. Stripe Connect enables instant ACH with identity verification built in. |
| Payout Run Schedule | 1st of each month. Aggregate all confirmed commissions per practitioner. Apply $50 minimum threshold. Amounts below threshold carry over. Generate payout batch file and submit to processor. |
| W-9 / Tax Collection | Collect W-9 at enrollment before first payout is permitted. Store TIN (encrypted at rest). Flag practitioners approaching $600 annual threshold for 1099-NEC generation. |
| Payout Status Webhook | Payment processor sends webhook on payout completion. Update `commission_ledger` rows to `status=paid`, `paid_at=timestamp` on receipt of webhook. |
| New Endpoints | `POST /api/v1/payouts/run` (internal, triggered by cron) \| `GET /api/v1/practitioners/{id}/payout-history` \| `POST /api/v1/payouts/webhook` (processor callback) \| `GET /api/v1/practitioners/{id}/tax-documents` |

### Step 6 — Score Alert System (Practitioner-Specific)

Extends the existing score change detection pipeline to notify practitioners when a product they are actively recommending changes score tier. This must fire before any consumer-facing notification.

| Task | Implementation Detail |
|------|----------------------|
| Trigger Condition | On any score recalculation: compare new tier to previous tier (Rejected / Standard / Verified / Elite). If tier changes: trigger practitioner alert job before updating consumer-facing score. |
| Practitioner Lookup | Query: find all `practitioner_ids` who have `product_id` in an active patient stack. Cross-reference `patient_practitioner_links`. Send alert to all active linked practitioners. |
| Alert Channels | In-app notification (dashboard feed). Email (transactional, Sendgrid or equivalent). Future: webhook for practice management system integrations. |
| Alert Content | Include: product name, old tier, new tier, summary of what changed in scoring (which dimension moved), recommended action (review / remove from stack / no action needed). Link to updated scorecard. |
| Dispensary Suspension on Downgrade | If product drops below Verified threshold (below 75): immediately mark as `is_eligible=false` in `dispensary_eligible_products`. No new commissions can accrue on this product until score recovers. |
| New Endpoints | `POST /api/v1/score-alerts/practitioners` (internal, called by scoring engine on tier change) \| `GET /api/v1/practitioners/{id}/alerts` \| `PUT /api/v1/practitioners/{id}/alerts/{alert_id}/read` |

---

## 8. Integrity Safeguards

The following rules are hardcoded product and system constraints, not configuration options. They protect Vyvata's scoring independence and brand reputation.

| Safeguard | Implementation Rule |
|-----------|---------------------|
| Commission rates NEVER affect ranking | No commission rate data is passed to or readable by the scoring engine, recommendation engine, or search ranking system. These services have no awareness of the dispensary program. |
| Score integrity gate | `dispensary_eligible_products` is written by the scoring engine, not the dispensary service. The dispensary service reads it as read-only. No dispensary logic can override a score-based eligibility flag. |
| FTC disclosure enforcement | If `ftc_agreed_at` is null or the agreement version does not match current version: commission earning is blocked at the ledger write stage. Agreement re-acceptance required before earnings resume. |
| Patient consent and data privacy | Patient account linking requires explicit patient consent at account creation. Patients can revoke the link at any time via account settings. Revocation takes immediate effect — no trailing attribution window. |
| Audit log (immutable) | All commission events, eligibility changes, and rate changes are written to an append-only audit log. No delete or update operations permitted. Required for FTC compliance and dispute resolution. |
| Self-dealing prohibition | Practitioners cannot earn commissions on purchases they make for themselves. At checkout: if buyer `user_id` matches a `practitioner_id` or patient linked to themselves, commission is suppressed. |

---

## 9. Implementation Roadmap Summary

| # | Build Area | Complexity | Dependencies / Notes |
|---|------------|------------|----------------------|
| 1 | Database Schema Extensions | Low | No dependency on existing tables. Safe to build in parallel. |
| 2 | License Verification Service | Medium | Depends on Step 1 (practitioners table). NPI API is free; state boards require manual fallback. |
| 3 | Attribution Tracking System | Medium–High | Depends on Steps 1–2. Must integrate with existing user accounts and order pipeline. |
| 4 | Commission Calculation Engine | Medium | Depends on Steps 1 and 3. Fires on purchase confirmation event from existing order service. |
| 5 | Payout Service | Medium | Depends on Step 4. Stripe Connect recommended. Requires W-9 collection at enrollment. |
| 6 | Score Alert System (Practitioner) | Low–Medium | Extends existing score change pipeline. Reads `dispensary_eligible_products`. No writes to scoring engine. |
| — | Practitioner Dashboard UI | Medium | Sits within Practitioner Pro/Elite portal. Consumes APIs from Steps 2–6. Can be built incrementally — show commissions first, then add alert feed and stack builder. |

> **ℹ️ NOTE**
>
> **RECOMMENDED BUILD ORDER:** Steps 1 → 2 → 3 → 4 can be developed in parallel by separate team members once Step 1 schema is defined. Step 5 (payouts) and Step 6 (alerts) depend on the outputs of the earlier steps. The Practitioner Dashboard UI can begin with mock data from Step 1 and be wired up as each API comes online.

---

**VYVATA CONFIDENTIAL — Do Not Distribute | © 2026 Vyvata. All rights reserved.**
