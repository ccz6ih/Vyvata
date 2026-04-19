# Brand Submission Portal - Implementation Gap Analysis

## Executive Summary

I built **~40% of the planned submission flow** - focused on core backend infrastructure and authenticated brand flow. The spec calls for a comprehensive 6-day sprint covering public entry, emails, approval pipeline, and cross-site integration.

---

## What I Built ✅

### Backend Infrastructure (Solid)
- ✅ API routes: `/api/brand/submissions` (GET, POST)
- ✅ API routes: `/api/brand/submissions/[id]` (GET, PATCH, DELETE)
- ✅ API routes: `/api/brand/submissions/[id]/submit` (status transition)
- ✅ API routes: `/api/brand/submissions/[id]/upload` (file upload)
- ✅ Form validation schemas (4 sections: Identity, Manufacturing, Clinical, Safety)
- ✅ Brand authentication (`brand-auth.ts` with `getBrandSession()`, `requireActiveBrand()`)
- ✅ File reference schema with JSONB storage

### Frontend Pages (Partial)
- ✅ `/brand/login` - Magic link login (reuses existing auth)
- ✅ `/brand/dashboard` - Shows submissions list with stats
- ✅ `/brand/submissions/new` - Creates draft and redirects to editor
- ✅ `/brand/submissions/[id]` - Multi-step form with 4 sections
- ✅ Form UI with progress stepper, save draft, submit actions

### Database (Ready)
- ✅ Tables exist: `brand_accounts`, `product_submissions`
- ✅ Schema tested and operational
- ✅ RLS policies in place (service role + authenticated brand self-read)

---

## What's Missing ❌ (Per Spec)

### Day 2 - Public Entry Point (0% complete)
- ❌ `/submit` public landing page
- ❌ `/submit/signup` brand signup form
- ❌ Email verification flow for new brands
- ❌ `brand_email_verifications` table + migration
- ❌ Resend template: "Verify your brand account"
- ❌ `/submit/verify` callback handler

**Why it matters:** No discoverability. Brands can't find the flow without direct instruction.

### Day 3 - Submission Form Differences (60% complete)
**What I built:**
- 4 sections: Product Identity, Manufacturing, Clinical, Safety
- Basic text inputs and checkboxes
- Placeholder ingredient editor ("coming soon")

**What spec calls for:**
- 5 distinct steps with more granular structure
- Step 1: Product identity + fuzzy-match existing products
- Step 2: Supplement facts with dynamic ingredient table (add/remove rows)
- Step 3: Certifications with per-cert uploads + verification URLs
- Step 4: Supporting documents (facts panel PDF, CoA, testing reports)
- Step 5: Review summary + legal attestation checkbox

**Gap:** My form is simplified. Missing dynamic ingredient table, per-cert uploads, facts panel upload requirement, legal attestation.

### Day 4 - Approval Pipeline (10% complete)
**What I built:**
- Admin review UI already existed (I didn't add much)
- Approve/reject/request-revision routes exist in `/api/admin/submissions/[id]/`

**What spec calls for:**
- ❌ `approveSubmission()` transaction that:
  - Resolves target product (update existing or create new)
  - Replaces `product_ingredients` from submission data
  - Upserts certifications
  - Triggers `scoreProduct(productId, mode='verified')`
  - Writes to `product_scores` with `score_mode='verified'`
  - Updates submission status + timestamps
  - **All-or-nothing transaction** (critical non-negotiable #5)
- ❌ `submission_history` table for audit trail
- ❌ State machine enforcement (only valid transitions)
- ❌ Reviewer identification (`reviewer_email` required)

**Why it matters:** Admin can click "approve" but nothing happens to the product catalog. The whole point - getting verified data into scores - is missing.

### Day 5 - Email Flow (0% complete)
- ❌ 6 brand email templates:
  - `welcome.tsx` (account activation)
  - `submission-received.tsx`
  - `submission-reviewing.tsx`
  - `submission-needs-revision.tsx`
  - `submission-approved.tsx` (celebratory, links to scorecard)
  - `submission-rejected.tsx`
- ❌ 1 admin template: `admin-new-submission.tsx`
- ❌ Email wiring at each state transition
- ❌ `email_deliveries` table for observability
- ❌ Cross-site CTAs:
  - Methodology page "Submit for verification" links
  - Unscored scorecard banner with brand CTA
  - GapReportBlock "unlock these points" CTA
- ❌ Prefill support (`/submit?prefill={productId}`)
- ❌ `docs/submission-flow/BRAND-OUTREACH.md` for Craig's manual outreach

**Why it matters:** Flow is invisible. Brands have no discovery path, no feedback loop, no celebration on approval.

### Day 6 - QA & Launch (0% complete)
- ❌ End-to-end smoke tests (happy path, rejection, revision, security)
- ❌ Accessibility pass
- ❌ Mobile responsive pass
- ❌ Copy audit against `BRAND-STORY.md`
- ❌ `LAUNCH-CHECKLIST.md`
- ❌ Announcement copy (tweet, co-founder email, brand outreach template)

---

## Critical Non-Negotiables Status

From `00-README.md` - the 10 firm constraints:

1. ✅ **Verification is free** - No payment code
2. ⚠️ **No auto-approval** - Routes exist but transaction not built
3. ❌ **Reviewer identified** - `reviewer_email` field exists but not enforced
4. ✅ **No draft data leaks to public** - Submissions isolated
5. ❌ **Transactional approval** - Transaction NOT built (critical gap)
6. ❌ **Verified mode only for brand data** - Scoring integration missing
7. ⚠️ **Evidence-forward copy** - Limited copy written, not audited
8. ✅ **Legal attestation** - Field in schema but checkbox not in UI
9. ⚠️ **No impersonation** - RLS prevents but API doesn't validate manufacturer match
10. ⚠️ **Private file uploads** - Code exists but bucket not created

**Status:** 2 passing, 5 partial, 3 failing

---

## What Works Today (Manual Test)

1. Brand visits `/brand/login` → magic link → dashboard ✅
2. Brand clicks "New submission" → form loads ✅
3. Brand fills 4 sections → saves draft ✅
4. Brand clicks "Submit for review" → status changes to `submitted` ✅
5. Admin visits `/admin/submissions` → sees submission ✅
6. Admin clicks "Approve" → ... **NOTHING HAPPENS** ❌

**The critical failure:** Approval doesn't transfer data to products or trigger scoring.

---

## What Doesn't Work Today

1. No public entry point (can't get to `/brand/login` without URL)
2. New brands can't self-register (must be manually created in DB)
3. Approving a submission doesn't create/update the product
4. No emails sent at any stage
5. Ingredient editor is a placeholder
6. File uploads fail (bucket doesn't exist)
7. No cross-site discovery (methodology page doesn't link)
8. No legal attestation checkbox before submit

---

## Supabase Storage Status

**Code exists** for upload handling in `/api/brand/submissions/[id]/upload/route.ts`

**Bucket does NOT exist** - Returns error:
```
Storage bucket not configured. Admin needs to create 
'brand-submissions' bucket in Supabase Storage.
```

**What's needed:**
1. Create bucket in Supabase Dashboard
2. Apply RLS policies (spec in `BRAND-SUBMISSION-SETUP.md`)
3. Test upload path

---

## Recommended Priority Order

### P0 - Blocker (Submission flow literally doesn't work)
1. **Build approval transaction** (Day 4, 4-6 hrs)
   - The `approveSubmission()` function that writes to products/ingredients/scores
   - This is the whole point - without it, approval is a no-op
2. **Create Storage bucket** (5 min)
   - Apply RLS policies
   - Test file upload

### P1 - Core Flow (Makes it usable)
3. **Public `/submit` landing** (Day 2, 2-3 hrs)
4. **Email verification for brands** (Day 2, 1-2 hrs)
5. **Fix ingredient editor** (Day 3, 2-3 hrs)
   - Dynamic table with add/remove rows
   - Proper dose/unit/form fields
6. **Legal attestation checkbox** (Day 3, 30 min)

### P2 - Discoverability (Brands can find it)
7. **6 email templates + wiring** (Day 5, 4-6 hrs)
8. **Cross-site CTAs** (Day 5, 2-3 hrs)
   - Methodology page links
   - Unscored scorecard banner
   - GapReportBlock CTA

### P3 - Polish (Nice to have)
9. **Submission history audit trail** (Day 4, 1-2 hrs)
10. **Brand outreach doc** (Day 5, 1 hr)
11. **QA pass + launch checklist** (Day 6, 4-6 hrs)

---

## Estimated Work Remaining

- **P0 (Critical):** 4-6 hours
- **P1 (Core):** 8-12 hours  
- **P2 (Discovery):** 6-9 hours
- **P3 (Polish):** 6-9 hours

**Total to full spec:** 24-36 hours (3-4.5 days)

**Minimum viable (P0+P1):** 12-18 hours (1.5-2 days)

---

## What I'd Recommend

**Option A - Finish the spec** (3-4 days)
Complete Days 2-6 as written. Ship the full vision.

**Option B - MVP launch** (1-2 days)
- Fix approval transaction (P0)
- Add public landing + email verify (P1)
- Fix ingredient editor + attestation (P1)
- Ship with manual brand outreach (skip automated discovery)
- Iterate based on first 5 brand submissions

**Option C - Pivot**
If submission flow isn't the priority, what is? The catalog growth engine (import scripts) or something else?

What would you like to tackle first?
