# Day 2 — Public `/submit` Landing + Brand Account Creation

**Role:** Full-stack engineer. Build the public entry point for brand
submissions and the signup + email verification flow.

**Prerequisite:** Day 1 audit complete. `.agents/reports/submission-day-1-*.md`
exists and has been reviewed by Craig.

**Read first:**
- `docs/submission-flow/00-README.md` §Critical non-negotiables
- `docs/submission-flow/01-audit.md` (output of Day 1)
- `docs/BRAND-STORY.md`
- The audit report — especially the sections on existing auth and the
  recommended adjustments

---

## Scope

### 1. Public landing page at `/submit`

**File:** `src/app/submit/page.tsx` (new)

Server component, no auth required, publicly accessible.

**Content sections (write copy in brand voice, evidence-forward, no hype):**

- Hero: "Verify your product on Vyvata" with one-sentence explanation
  that verification is free forever, takes ~10 minutes, and earns a
  Verified-tier score based on submitted documentation
- How it works: 3-step breakdown (submit → review → verified score
  appears publicly)
- What verification earns you: Verified tier eligibility, the 21-point
  upside vs AI Inferred, methodology page link for reference
- What we need from you: list of required documents (supplement facts
  panel, certification certificates, manufacturer details)
- What we never do: sell your data, display your submission before
  approval, charge for verification
- CTA: "Start verification" → goes to `/submit/signup` if not logged
  in, `/brand/dashboard` if logged in as brand

**Design language:** matches existing homepage and methodology page —
dark blue (#0B1F3B) background, Montserrat headings, Inter body,
teal accents (#14B8A6) for CTAs. Use the existing `AuthNavLink` +
full nav pattern from the scorecard page.

### 2. Brand signup at `/submit/signup`

**File:** `src/app/submit/signup/page.tsx` (new) + server action

Form fields:
- Email (required, must be unique — check `brand_accounts.email`)
- Company name (required, stored as `brand_accounts.company_name`)
- Contact name (optional)
- Role at company (optional, stored as `brand_accounts.contact_role`)
- Checkbox: "I am authorized to submit product data on behalf of this
  company" (required, legal attestation)

On submit:
1. Validate input server-side
2. Insert into `brand_accounts` with `status = 'pending'` and
   `email_verified_at = NULL`
3. Generate a verification token (secure random, 32 bytes)
4. Store it (new table `brand_email_verifications` — write the migration)
5. Send verification email via Resend (template in next step)
6. Show confirmation screen: "Check your inbox at {email}"

### 3. Verification email

**Path:** `src/lib/emails/brand-verification.tsx` (new — likely a React
Email template if the project already uses react-email)

Subject: "Verify your Vyvata brand account"
Body:
- "Thanks for starting verification for {company_name}"
- Single CTA button linking to `/submit/verify?token={token}`
- Expiry note: "Link expires in 24 hours"
- Footer: Vyvata logo, unsubscribe disclaimer, methodology link

Send via Resend. Use the existing Resend client in `src/lib/` (audit will
have surfaced its location).

### 4. Verification handler at `/submit/verify`

**File:** `src/app/submit/verify/page.tsx` (new)

On GET with `?token={token}`:
1. Look up token in `brand_email_verifications`
2. If not found, expired, or already used → error screen with
   "Request a new link" CTA
3. If valid → set `brand_accounts.email_verified_at = NOW()`, set
   `status = 'active'`, mark token as used, redirect to `/brand/dashboard`

### 5. Brand session establishment

Reuse whatever auth mechanism the audit recommended. Options in
priority order:

- **Magic link** (preferred for brands — zero-password, friction-free):
  extend or mirror the existing Resend flow
- **Password-based** (if that's what the audit says is already in place):
  add a password field to signup, hash with bcrypt or argon2
- **Supabase Auth email OTP**: if the existing brand login uses it

Pick whichever the audit identifies as the least-effort continuation
of what's already there. Do NOT introduce a new auth mechanism if
one exists.

### 6. Migration

**File:** `supabase/migrations/YYYYMMDD_brand_email_verifications.sql`

```sql
CREATE TABLE public.brand_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz
);

CREATE INDEX idx_brand_email_verifications_token ON public.brand_email_verifications (token_hash);
CREATE INDEX idx_brand_email_verifications_account ON public.brand_email_verifications (brand_account_id, created_at DESC);

ALTER TABLE public.brand_email_verifications ENABLE ROW LEVEL SECURITY;
-- service role only — no anon access
```

Store `token_hash` not the raw token. Hash with SHA-256 on insert and
lookup — same pattern as password reset tokens elsewhere in the codebase
(audit will confirm if there's a helper).

---

## Deliverables

1. **Patch:** `.agents/patches/submission-day-2-YYYY-MM-DD.patch`
   with all new files and migrations
2. **Report:** `.agents/reports/submission-day-2-YYYY-MM-DD.md`:
   - What was built
   - Any audit recommendations honored
   - Any audit recommendations contradicted, with reasoning
   - Screenshot of `/submit`, `/submit/signup`, and the verification email
   - Manual test trace: created a test brand account end-to-end,
     verified email landed, verify link worked, brand dashboard accessible
3. **Migration ready to apply:** `supabase/migrations/YYYYMMDD_brand_email_verifications.sql`

## Success criteria

- `/submit` renders publicly and matches site visual language
- A new email can sign up and receive a verification email
- Clicking the verification link activates the account and lands the
  user on `/brand/dashboard`
- Expired and reused tokens error gracefully
- No secrets (Resend API key, Supabase service role) leak into client bundle
- Nothing about this flow touches `products` or `product_submissions`
  yet — those come in Day 3
