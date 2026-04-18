# Vyvata User Flows

Three audiences, three flows. This doc captures what exists today, the friction points, and the shape of where each flow should go next.

---

## 1. End user (B2C) — anonymous, no account

### Current flow

```
Landing (/)
  │
  ├─ Paste stack text in hero textarea ─────┐
  │                                         │
  └─ "Take the quiz" CTA ──→ /quiz          │
                               │            │
                               ▼            ▼
                     (collects quiz data)  /goals
                               │            │
                               └─────┬──────┘
                                     ▼
                                /processing
                                     │
                               runs /api/parse-stack
                                     │
                                     ▼
                              /protocol/[slug]
                              (teaser only, gated)
                                     │
                               Email → Unlock CTA
                                     │
                               /api/unlock-report
                                     │
                           ┌─────────┴──────────┐
                           ▼                    ▼
                   Full report shown   Resend: email with link
                   in-browser          back to /protocol/[slug]
```

**Auth model:** there isn't one.

- `sessionStorage` UUID ([src/lib/session.ts:6-14](../src/lib/session.ts#L6-L14)) identifies the browser tab; goes away when the tab closes.
- Email is captured only at unlock ([src/app/api/unlock-report/route.ts:18](../src/app/api/unlock-report/route.ts#L18)) and stored on the `audits` row.
- The protocol `public_slug` is the access control — anyone with the URL sees it.
- No password, no "sign in", no history page, no multi-device.

### Friction points

1. **URL-as-credential.** If a user loses the email, they have no way back to their report. No "sign in with my email" lookup exists.
2. **No history.** Running the flow twice produces two unrelated reports with no way to see both.
3. **No re-run / update.** A user who tried the flow 3 months ago and wants to re-check after changing their stack starts from scratch.
4. **Email gate is high-friction for low-intent traffic.** Users who paste a stack out of curiosity hit a wall before ever seeing the full report.

### How to test it **right now**

1. `npm run dev` (already running)
2. Open [http://localhost:3000](http://localhost:3000)
3. Paste into the hero textarea:
   ```
   Vitamin D3 5000IU
   Magnesium Glycinate 400mg
   Fish Oil 2000mg EPA/DHA
   L-Theanine 200mg
   ```
4. Click "Analyze & Build My Protocol" → pick 2–3 goals on `/goals` → watch the processing animation
5. On the teaser page, enter your real email → unlock
6. **Check inbox** — you should get a Resend email within seconds ("Your Vyvata protocol is ready"). Click the button → full report loads.

### Future direction (post-Phase 3)

Options, ranked by effort vs. value:

| Option | Effort | Value | Notes |
|---|---|---|---|
| **Magic link sign-in** (email → clickable link → session cookie) | S | High | Resend is live — this is ~1 day of work. Gives users a way back to all their past reports with no password. |
| **"Resume by email" lookup** (enter email → email you a list of your past reports) | XS | Medium | Simpler than magic link; no session state. Might be a good first step. |
| **Soft account** (password + optional MFA) | M | Medium | Only worth it when users start asking for it. Magic link solves 90% of the same problem. |
| **Protocol history page** (`/me` or `/protocols`) | S, after above | High | Needs an auth identity first. Pair with magic link. |
| **Scheduled re-audit** (we ping you every 90 days to re-run the flow) | S, after above | Medium | Email-first engagement loop. |

Recommendation: **magic link first**. Keep the anonymous "just try it" flow intact — magic link is opt-in at unlock ("Email me my report" stays as-is; new CTA: "Also save this to my account").

---

## 2. Practitioner (B2B) — email + access code

### Current flow

```
/practitioner (auth gate)
  │
  ├─ Not signed in → /practitioner/login
  │     │
  │     └─ Email + 4-4 access code
  │         │
  │         └─ /api/practitioner/auth
  │             │
  │             ├─ Valid → set vv_prac_token cookie (7d) → /dashboard
  │             └─ Invalid → error
  │                 │
  │                 └─ "Lost your access code?" → /practitioner/recover
  │                       │
  │                       └─ New code emailed, sessions invalidated
  │
  └─ Already signed in → /practitioner/dashboard
                           │
                           ├─ Patient list
                           ├─ Protocol distribution
                           ├─ Top-protocol stat
                           └─ "Add patient" → enter public_slug of a B2C audit
                                 │
                                 └─ /practitioner/patients/[id] (detail view)
```

### Registration flow (new practitioners)

```
/practitioner/register
  │
  └─ Multi-step intake form
        │
        └─ /api/practitioner/register
              │
              ├─ Creates practitioner row, status="pending"
              ├─ Generates 4-4 access code (stored, NOT emailed yet)
              └─ Resend: confirmation email ("We got your application")

Admin side:
  /admin (behind VYVATA_ADMIN_SECRET cookie)
    │
    └─ Reviews pending apps → Approve
          │
          ├─ Flips status="approved", is_verified=true, is_active=true
          └─ Resend: email with access code
```

### Friction points

1. **Access codes are unfamiliar.** Practitioners expect password or magic link. Code-in-email is a mental-model mismatch.
2. **Admin approval is a human bottleneck.** Scale will break this fast. Some path to auto-approve (LLM-review + license-number verification service) is the eventual answer.
3. **Single-seat.** No concept of multiple practitioners in one clinic sharing patients.

### How to test it right now

1. Go to [http://localhost:3000/practitioner/login](http://localhost:3000/practitioner/login)
2. Email: `demo@vyvata.com` — Code: `DEMO-2026`
3. Land on dashboard. It's empty unless you've added patients.
4. To add one: first run the **B2C flow** in another tab, copy the `public_slug` from the `/protocol/[slug]` URL, then click "Add Patient" on the dashboard and paste the slug.
5. Test recovery: [http://localhost:3000/practitioner/recover](http://localhost:3000/practitioner/recover) → enter `demo@vyvata.com` → check email. **Warning:** this invalidates `DEMO-2026` and emails a new code, so use a throwaway email or be ready to get the new code from the email.

### Future direction

| Option | Effort | Value |
|---|---|---|
| **Magic link as alternative to access codes** | S | High — removes the friction of "what was my code again" |
| **Patient invite link** (practitioner sends a link → patient fills quiz → result auto-linked to practitioner) | M | Very high — this is the core B2B acquisition loop |
| **Clinic / multi-seat** (one practitioner "owner" invites colleagues) | L | Defer to Phase 3-4 |
| **License verification** (auto-check NPI / state registry → auto-approve) | M | Unblocks scale |
| **Practitioner onboarding sequence** (Resend drip: day 0, day 3, day 7) | S | Retention |

---

## 3. Admin — single-user internal tool

### Current flow

```
/admin (server component)
  │
  ├─ No cookie → redirect to /admin/login
  └─ Cookie valid → AdminClient
       │
       ├─ Stats row (pending/approved/rejected counts)
       ├─ Tabs (pending / approved / rejected)
       └─ Per-applicant card
             ├─ Approve → Resend: access code email
             └─ Reject (with reason) → Resend: rejection email
```

### How to test it right now

1. Set `VYVATA_ADMIN_SECRET` in `.env.local` — generate with `openssl rand -hex 32`
2. Restart `npm run dev` so the env var loads
3. Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login) → paste the secret → land on admin dashboard
4. You'll see the seeded demo practitioner in the "approved" tab. New applications would appear in "pending" after someone submits `/practitioner/register`.

### Future direction

- Audit log of admin actions (who approved whom, when)
- Multi-admin (currently the secret is shared)
- Notes / tags on applications

---

## Unified future plan (suggested order)

**Phase 3 candidate:** B2C magic link + "My protocols" history page. Effort: ~2-3 days. Impact: fundamentally changes what Vyvata *is* from the user's perspective (one-shot tool → ongoing service).

Steps:

1. `POST /api/auth/magic-link` — accepts email, generates one-time token, Resend emails a link
2. `GET /api/auth/callback?token=…` — validates, sets `vv_user_token` HttpOnly cookie (30d)
3. Migrate `users` table to hold `id`, `email`, `created_at`, `last_login_at`
4. Backfill: link existing `audits.email` to new `users` rows
5. `/me` page: lists a user's `audits` (past protocols) + `quiz_responses`
6. Opt-in at unlock: checkbox "Save this to my account" → if checked, prompt magic-link flow
7. Existing anonymous unlock flow stays — no regression for low-intent users

**Phase 3-alt:** practitioner patient-invite link. Equal priority if B2B is the near-term growth channel.

---

## Testing checklist (~10 minutes)

Run through all three flows in this order:

- [ ] **B2C golden path**: paste → goals → processing → unlock → confirm Resend email arrives → click back
- [ ] **B2C quiz path**: `/quiz` → multi-step → land on protocol
- [ ] **Practitioner login**: `demo@vyvata.com` / `DEMO-2026` → dashboard
- [ ] **Practitioner: add patient**: use the `public_slug` from your B2C run above
- [ ] **Practitioner: patient detail**: open the added patient; verify notes editing, status chips, archive
- [ ] **Practitioner: logout** → recovery: `/practitioner/recover` with a throwaway email (verify the "we sent a code if the email exists" generic response)
- [ ] **Admin**: after setting `VYVATA_ADMIN_SECRET`, log in at `/admin/login`, see the demo practitioner in approved tab
- [ ] **Admin: register flow end-to-end**: submit `/practitioner/register` with a throwaway email → confirmation email arrives → application shows up in admin pending → approve → access code email arrives → login with new code works
- [ ] **Rate limits**: try logging in with wrong code 6 times at `/practitioner/login` → 6th attempt returns 429

If any of these surface friction, note it in the relevant "Friction points" section above.
