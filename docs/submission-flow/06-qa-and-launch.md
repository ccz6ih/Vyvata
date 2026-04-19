# Day 6 — QA, Smoke Test, Launch Prep

**Role:** QA engineer + tech writer. Verify the full flow end-to-end,
catch anything broken, and prepare launch comms.

**Prerequisite:** Days 2-5 complete. Flow technically works; this day
catches what the happy-path builders missed.

**Read first:**
- All Day 1-5 reports in `.agents/reports/`
- `docs/submission-flow/00-README.md` §Critical non-negotiables

---

## Scope

### 1. End-to-end smoke tests

Walk through every path manually. Document each with screenshots in
the final report.

**Happy path — new product submission:**
1. Fresh brand, never seen before. Visit `/submit`.
2. Click "Start verification" → `/submit/signup`
3. Sign up with a real email address you control
4. Verify email via the link sent
5. Land on `/brand/dashboard`
6. Click "Submit a new product"
7. Complete all 5 steps with real data for a real product
8. Submit for review
9. Switch to admin identity. Open `/admin/submissions`.
10. Claim, review, approve
11. Check `/products/[slug]` for the approved product — scorecard
    should show `score_mode = 'verified'` with the new tier
12. Check brand's email inbox — 4 emails received (welcome, received,
    reviewing, approved)

**Happy path — existing product upgrade:**
1. Same as above, but on Step 1 select a product Vyvata already has
   AI-scored
2. Submit, approve
3. Verify the existing product's scorecard flipped from AI Inferred
   to Verified and the score changed appropriately

**Rejection path:**
1. Fresh brand submits a product with obvious data issues
   (e.g., ingredient doses impossible, proprietary-blend abuse)
2. Admin rejects with clear notes
3. Brand sees rejection reason in dashboard
4. Brand email receives rejection notice with reason
5. Verify nothing changed on public `/products`

**Revision path:**
1. Brand submits
2. Admin requests revision (missing CoA)
3. Brand receives email with revision notes
4. Brand dashboard shows submission in `needs_revision` status
5. Brand clicks "Respond to reviewer"
6. Editor shows reviewer notes prominently
7. Brand re-uploads CoA and resubmits
8. Status returns to `submitted`
9. Admin approves
10. All 6 state-transition emails delivered across the cycle

**Security paths:**
- Brand A attempts to access Brand B's submission URL → 403
- Brand A attempts to access Brand B's uploaded file → 403
- Anonymous user attempts to POST to `/api/submissions/*` → 401
- Anonymous user attempts to GET `/admin/submissions` → redirect to admin login
- Admin without claim attempts to approve → blocked (must claim first)
- Same admin tries to approve own brand's submission (if admin is also a brand) → blocked

**Edge cases:**
- Submission with 0 ingredients → blocked with validation error
- Submission with no facts panel upload → blocked
- Certificate marked checked but no cert number / upload → blocked
- Brand session expires mid-form → draft auto-saves, resume after re-auth
- Two admins claim the same submission at the same time → second claim fails gracefully
- Resend API outage → database transition still commits, email failure logged
- Submission approved while brand's draft edit in progress → draft shows "this submission was already approved"

### 2. Accessibility pass

- Every form field has a label
- Keyboard navigation works across all 5 form steps
- Error messages are screen-reader accessible
- Color contrast meets WCAG AA (Vyvata uses #C9D6DF text on #0B1F3B background — verify)
- File upload input has visible focus state
- Admin queue table is keyboard navigable

### 3. Mobile pass

- `/submit` landing renders on mobile
- Signup form usable on mobile (no horizontal scroll)
- Submission form Steps 1-5 all mobile-usable
- File upload works on mobile (most mobile browsers handle this)
- Brand dashboard table scrolls or reflows on narrow screens
- Admin review detail view works on tablet (not required on phone)

### 4. Copy audit

Walk every user-facing string. Check against `docs/BRAND-STORY.md`:
- No "AI-powered"
- No "wellness optimization"
- No hype verbs ("transform," "unlock your potential," etc.)
- "Verified" is specific and technical, not aspirational
- Every mention of free verification is clear it's free forever
- Every legal attestation is plain-language, not lawyer-speak

### 5. Update methodology page

Previously the methodology page said "brands can submit" without a
link. Now:
- Every mention of submission → link to `/submit`
- New section near the end: "How verification works" with the 3-step
  summary and a single CTA to `/submit`
- Changelog entry: "v1.1 — Brand verification flow live"

### 6. Launch checklist

**File:** `docs/submission-flow/LAUNCH-CHECKLIST.md`

Before Craig flips the switch:
- [ ] All migrations applied to prod
- [ ] All patches committed and deployed to main
- [ ] Supabase Storage bucket `brand-submissions` exists with correct policies
- [ ] `VYVATA_ADMIN_EMAILS` env var set in prod
- [ ] Resend SPF/DKIM/DMARC pass
- [ ] Admin can log in to `/admin/submissions` in prod
- [ ] One smoke test submission completed end-to-end in prod
- [ ] Methodology page copy reflects live flow
- [ ] `/submit` is linked from methodology page and all unscored scorecards
- [ ] `docs/submission-flow/BRAND-OUTREACH.md` exists for Craig's manual outreach

### 7. Announcement copy

Three things for Craig to send post-launch:

**A. Tweet/LinkedIn post:**
"Vyvata now accepts brand submissions for verification — free, forever.
Independent integrity scoring derived from your actual supplement
facts panel and third-party certifications. If you're a supplement
brand, submit at vyvata.com/submit."

**B. Email to Bucket A/B co-founder:**
One-paragraph update: submission flow is live, methodology page claim
is now backed by working infrastructure, here's the dashboard to
track inbound submissions, outreach template is in
`docs/submission-flow/BRAND-OUTREACH.md`.

**C. Template for outreach to brands already scored:**
(Handoff to `BRAND-OUTREACH.md`.)

---

## Deliverables

1. **Report:** `.agents/reports/submission-day-6-YYYY-MM-DD.md`:
   - All smoke test results with screenshots
   - Accessibility pass with any issues flagged
   - Mobile pass with any issues flagged
   - Copy audit flagging any voice violations
   - Launch checklist status

2. **Doc:** `docs/submission-flow/LAUNCH-CHECKLIST.md`

3. **Patch:** `.agents/patches/submission-day-6-YYYY-MM-DD.patch`
   for any bug fixes found during QA and the methodology page updates

## Success criteria

- Every path in §1 smoke tests passes
- Accessibility and mobile pass have zero blockers (P0/P1 issues)
- Copy audit has zero brand-voice violations
- Launch checklist is complete and Craig can flip the switch in prod
  with confidence
- All three announcement copy pieces are ready

## What this sprint does NOT do (explicit)

- Does not build payment or billing
- Does not build multi-user brand accounts
- Does not build bulk CSV upload
- Does not build OCR or automated facts-panel parsing
- Does not build Shopify Collective or Fullscript integration
- Does not build outbound brand prospecting (Craig's manual work)
- Does not migrate existing AI-inferred scores to Verified — only new
  submissions earn Verified tier

Those are future work. The goal of this sprint is the working loop,
not the whole ecosystem.
