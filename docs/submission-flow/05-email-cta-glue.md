# Day 5 — Email Flow + Cross-Site CTAs

**Role:** Full-stack engineer. Wire transactional emails for every
state transition, and add submission entry points across the public
site so brands can find this flow without an invitation.

**Prerequisite:** Days 2-4 complete. The submission flow works end-to-end
but is currently invisible unless a brand knows to visit `/submit`.

**Read first:**
- `docs/submission-flow/00-README.md` §Critical non-negotiables
- `docs/BRAND-STORY.md`
- The existing Resend integration (audit will have located it)

---

## Scope

### 1. Email templates

Build six templates in `src/lib/emails/brand/`. If the project uses
react-email (check — the audit will have confirmed), use that.
Otherwise plain HTML with a shared header/footer.

**1. `welcome.tsx`** — sent on account activation after email verification
- Subject: "Your Vyvata brand account is active"
- Body: welcomes the brand, links to `/brand/dashboard` and methodology

**2. `submission-received.tsx`** — sent when brand hits submit
- Subject: "Submission received: {product_name}"
- Body: confirms what was submitted, notes typical review time
  ("Our team reviews submissions within 5 business days"), single
  CTA back to dashboard

**3. `submission-reviewing.tsx`** — sent when admin claims
- Subject: "Your submission is under review"
- Body: short note that a reviewer is now assessing

**4. `submission-needs-revision.tsx`** — sent on revision request
- Subject: "Revisions requested: {product_name}"
- Body: reviewer's notes displayed clearly, single CTA to the
  submission editor

**5. `submission-approved.tsx`** — sent on approval
- Subject: "{product_name} is now Verified on Vyvata"
- Body: celebratory but evidence-forward — "Your submitted data has
  been approved. The product's score has been updated to reflect
  verified data." CTA to view the public scorecard at
  `/products/[slug]` and a second CTA to submit another product.

**6. `submission-rejected.tsx`** — sent on rejection
- Subject: "Submission not approved: {product_name}"
- Body: reviewer's rejection reason, explanation that brand can start
  a new submission addressing the concerns, CTA to dashboard

**Shared styling:**
- Vyvata wordmark in header (use the existing svg or inline)
- Brand voice: evidence-forward, no hype, no emojis except in footer
- Footer with methodology link, privacy policy link, "this is a
  transactional email" disclaimer
- Plain-text fallback for every HTML template (Resend requires both)

### 2. Email wiring

Hook each send into the right state transition:

- **Day 2 server action** `verify email` → `welcome.tsx` on success
- **Day 3 server action** `submitForReview` → `submission-received.tsx`
- **Day 4 admin action** `Claim for review` → `submission-reviewing.tsx`
- **Day 4 admin action** `Request revision` → `submission-needs-revision.tsx`
- **Day 4 admin action** `Approve` → `submission-approved.tsx`
- **Day 4 admin action** `Reject` → `submission-rejected.tsx`

Every send is fire-and-forget — a Resend failure must not block the
database transition. Log Resend errors to `scraper_runs`-equivalent or
a new `email_deliveries` table for observability.

**Migration:** `YYYYMMDD_email_deliveries.sql`
```sql
CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz,
  resend_message_id text,
  error text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_deliveries_recipient ON public.email_deliveries (recipient_email, created_at DESC);
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
```

### 3. Admin notification email

When a submission moves to `submitted` status, also send an email to
the admin team:

- **Template:** `admin-new-submission.tsx`
- Subject: "[Vyvata] New submission: {brand} — {product_name}"
- Body: summary of submission + direct link to `/admin/submissions/[id]`
- Recipients: read from `VYVATA_ADMIN_EMAILS` env var (comma-separated
  list). If unset, fall back to `ADMIN_NOTIFICATION_EMAIL`. If both
  unset, log a warning and no-op (never crash).

### 4. Cross-site CTAs

Add submission entry points to public surfaces where relevant. Keep
copy brand-voice-compliant:

**Methodology page (`src/app/methodology/page.tsx`):**
The page already mentions brand submission. Make every mention a link
to `/submit`. Add an inline CTA card near the bottom:
- "Are you a brand? Verify your product on Vyvata — free, forever."
- Button: "Submit for verification" → `/submit`

**Unscored scorecard state (`src/app/products/[slug]/page.tsx`):**
Not every product has a score. For products with no score yet, the
page should have:
- "This product isn't scored yet" banner
- Single CTA: "Are you the brand? Submit data to verify" → `/submit?prefill={productId}`

(The prefill param is a hint — the submission form reads it and
pre-populates product_id if the brand authenticates and claims it.)

**GapReportBlock component (`src/components/GapReportBlock.tsx`):**
This already shows the 21-point upside. Extend the CTA:
- Existing: shows gap analysis
- Add: "Brand: submit verification to unlock these points" → `/submit?prefill={productId}`

**Homepage (`src/app/page.tsx`):**
Do NOT surface submission on homepage — this is a brand-facing feature
and homepage is consumer-facing. Skip.

**Brand signup page:**
After signup, if the user came from a prefill link, preserve the
`productId` context through the verify flow so the first submission
starts pre-populated.

### 5. Post-launch: brand outreach brief

**File:** `docs/submission-flow/BRAND-OUTREACH.md`

Write a short doc for Craig (not code) on how to use the flow
post-launch:

- Which brands to contact first (top 20 scored brands, sorted by
  how many products Vyvata tracks for them)
- Email template Craig can send ("We scored N of your products. Here's
  the gap report. Here's how to claim Verified status — free.")
- How to track which brands have been contacted (simple sheet or
  `brand_accounts.contacted_at` column if Craig wants to track in DB)
- Escalation path for high-priority brands (Thorne, Pure Encapsulations,
  Life Extension)

---

## Deliverables

1. **Patch:** `.agents/patches/submission-day-5-YYYY-MM-DD.patch`
2. **Migration:** `YYYYMMDD_email_deliveries.sql`
3. **Doc:** `docs/submission-flow/BRAND-OUTREACH.md`
4. **Report:** `.agents/reports/submission-day-5-YYYY-MM-DD.md`:
   - Screenshots of all 7 email templates (6 brand + 1 admin)
   - Test trace: walked through all 6 state transitions, verified
     matching email landed in test inbox
   - Screenshots of methodology page CTA, unscored scorecard state,
     GapReportBlock with new CTA
   - Resend deliverability check: verified SPF / DKIM / DMARC pass
     for Vyvata's sending domain

## Success criteria

- Every state transition triggers exactly the right email
- Emails render correctly in Gmail, Outlook, and Apple Mail (screenshot each)
- Admin team gets notified on every new submission
- A brand following a prefill link from an unscored scorecard lands
  in the flow with product_id pre-populated after auth
- SPF/DKIM/DMARC all pass on Vyvata's sending domain
- No email can leak a submission's confidential uploads (e.g., never
  attach the facts-panel PDF to an outbound email)
- Resend failures log to `email_deliveries.error` and don't block the
  database transition
