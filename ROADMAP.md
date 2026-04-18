# Vyvata Roadmap

Snapshot of what's built, what's missing, and a phased plan to production.
Last updated: 2026-04-18 (Phase 2 complete).

---

## 1. What we have

### User-facing flows (all functional, all pages return 200)

**B2C (anonymous):**
- Landing ([src/app/page.tsx](src/app/page.tsx)) — hero, protocol cards, CTAs
- Goal selector ([src/app/goals/page.tsx](src/app/goals/page.tsx)) — 7 goals, multi-select (max 3)
- Guided quiz ([src/app/quiz/page.tsx](src/app/quiz/page.tsx)) — multi-step intake → `/api/quiz`
- Processing animation ([src/app/processing/page.tsx](src/app/processing/page.tsx)) → `/api/parse-stack`
- Protocol result ([src/app/protocol/[slug]/ProtocolClient.tsx](src/app/protocol/%5Bslug%5D/ProtocolClient.tsx)) — teaser + gated full report

**B2B (practitioner):**
- Register → pending → approved → login → dashboard → patient detail
- Full CRUD on patient links; protocol distribution charts; top-protocol stat

**Admin:**
- Applications review ([src/app/admin/AdminClient.tsx](src/app/admin/AdminClient.tsx)) — approve/reject with counts by status

### Engine (domain logic)
- **Ingredients DB** — **152 records** in [src/lib/ingredients-db.ts](src/lib/ingredients-db.ts) (vitamins, minerals, adaptogens, nootropics, longevity, medicinal mushrooms, amino acids, etc.) with aliases, evidence tier, dose ranges, interactions, synergies
- **Rules engine** — [src/lib/rules-engine.ts](src/lib/rules-engine.ts) deterministic: matches, interactions (with severity classification), redundancies, dose checks, timing, goal gaps, synergies detection, cycling recommendations
- **Stack parser** — [src/lib/stack-parser.ts](src/lib/stack-parser.ts) freeform text → structured ingredients + dose + unit
- **LLM synthesis** — [src/lib/llm-synthesizer.ts](src/lib/llm-synthesizer.ts) OpenAI `gpt-4o` with compliance-enforced system prompt; deterministic fallback when key missing
- **Protocol templates** — [src/lib/protocol-templates.ts](src/lib/protocol-templates.ts) 5 canonical protocols (cognitive performance, deep sleep, athletic, longevity, immune support) with evidence summaries
- **Evidence library** — [src/lib/evidence-summaries.ts](src/lib/evidence-summaries.ts) 10 clinical summaries (200-300 words, PubMed citations) for top ingredients, interactions, and protocols

### Integrations
| Service | Wired | Fallback | Status |
|---|---|---|---|
| Supabase | ✅ | ❌ throws if missing | Critical, working |
| OpenAI | ✅ | ✅ deterministic report | **Currently on fallback** — no `OPENAI_API_KEY` set |
| Resend | ✅ | ✅ silent skip | Working if key set |

### Auth
- **Practitioner** — email + access code, 7-day session token in `vv_prac_token` httpOnly cookie, `verification_status` gate
- **Anonymous** — UUID in sessionStorage; email captured at unlock
- **Admin** — `?secret=…` query param + `Authorization: Bearer` header

---

## 1.5. Specialized AI Agents

Vyvata has four specialized AI agents to accelerate development and maintain quality. See [AGENTS-INDEX.md](AGENTS-INDEX.md) for full details.

| Agent | Domain | Primary Use Cases |
|---|---|---|
| **Vyvata Orchestrator** | Full-stack coordination, docs, QA | Execute roadmap phases, review security, update docs |
| **Health Data Scraper** | Supplement/ingredient data | Expand ingredient DB 51→150+, research interactions |
| **Supabase Guardian** | Database schema, migrations, RLS | Create tables, audit policies, optimize queries |
| **Clinical Protocol Architect** | Evidence-based protocols | Design protocol templates, write evidence summaries |

**Agent-to-Phase mapping:**
- Phase 0: Orchestrator + Supabase Guardian
- Phase 1: Orchestrator + Supabase Guardian (rate limits, admin auth)
- Phase 2: Health Data Scraper + Clinical Protocol Architect (ingredients → protocols → evidence)
- Phase 3-4: Orchestrator coordinates billing, outcomes, wearables

---

## 2. What's missing or broken

### Critical gaps
- **OpenAI is off** — deterministic fallback works but reports are less personalized. Set `OPENAI_API_KEY` and measure quality lift.
- **Admin secret in query string** — logged in browser history and server logs. Move to header-based auth or a dedicated admin login.
- **No rate limiting** on `/api/practitioner/auth` — brute-force risk against 4-4 access codes.
- ~~`increment_patient_count` RPC missing~~ → **Fixed in Phase 0** by recomputing `patient_count` from `patient_links` on add/archive.

### Supabase state (verified)
Probed directly against the live project. All 10 tables exist:
`sessions`, `audits`, `users`, `quiz_responses`, `practitioners`, `practitioner_sessions`, `patient_links` (all wired in code).

**Phase 2 additions (migration ready):**
`protocols` table with RLS policies and 5 seeded templates: cognitive-performance-v1, deep-sleep-recovery-v1, athletic-performance-v1, longevity-foundation-v1, immune-support-v1 (migration: [supabase/migrations/20260418_create_protocols_table.sql](supabase/migrations/20260418_create_protocols_table.sql)).

**Future phases:**
`outcomes` (wearables), `referrals` (practitioner attribution) — provisioned but not yet wired.

Demo practitioner seeded: `demo@vyvata.com` / `DEMO-2026` (approved, active).
~~Practitioner dashboard evidence summaries~~ → **✅ Built in Phase 2** ([evidence-summaries.ts](src/lib/evidence-summaries.ts)); needs UI wiring in [DashboardClient.tsx](src/app/practitioner/dashboard/DashboardClient.tsx)
- ~~Protocol templates~~ → **✅ Built in Phase 2** ([protocol-templates.ts](src/lib/protocol-templates.ts) + migration); needs UI wiring in `/protocol/[slug]` page
- Wearable outcomes (`outcomes` table)
- Referral loop (`referrals` table mentioned in README, not wired)
- ~~Lost-access-code recovery flow~~ → **✅ Built in Phase 1** ([/practitioner/recover](src/app/practitioner/recover/page.tsx))
### Deferred features (explicit)
- Practitioner dashboard evidence summaries — marked "coming in v2" in [DashboardClient.tsx](src/app/practitioner/dashboard/DashboardClient.tsx)
- Protocol templates (`protocols` table)
- Wearable outcomes (`outcomes` table)
- Referral loop (`referrals` table mentioned in README, not wired)
- Lost-access-code recovery flow for practitioners

### Quality / DX
- No automated tests
- Dev warnings: `metadataBase` not set; `data-scroll-behavior="smooth"` missing on `<html>` (Next 16)
- 56 uploaded SVG illustrations in [public/icons/](public/icons/) — unused (not yet wired into any page)

---

## 3. Phased plan

### Phase 0 — Housekeeping ✅ Done
Low-risk cleanup completed 2026-04-18.

- [x] Update README: Next.js 16, actual routes, remove StackReceipts naming
- [x] Add `metadataBase` to [src/app/layout.tsx](src/app/layout.tsx)
- [x] Add `data-scroll-behavior="smooth"` to `<html>` element
- [x] Probe Supabase — all 10 tables exist; `protocols`/`outcomes`/`referrals` provisioned for future phases
- [x] Fix missing `increment_patient_count` RPC — recompute from `patient_links` on add/archive

### Phase 1 — Security & polish MVP ✅ In-code work done (2026-04-18)
Ship-ready hardening. Code-side shipped; three items below need your action.

**Done in code:**
- [x] Admin auth off query-param → cookie-based `/admin/login` with HttpOnly session cookie. Logout button in admin header. Bearer-header check replaced with `hasAdminSession()` on all admin API routes.
- [x] Rate limiting on `/api/practitioner/auth` (5/15min per IP+email), `/api/practitioner/register` (3/hr per IP), `/api/admin/auth` (5/15min per IP). In-memory sliding window; swap to shared store when deploying multi-instance.
- [x] Lost-access-code flow: `/practitioner/recover` + `POST /api/practitioner/recover`. Issues a new code, invalidates all active sessions, sends email. Always returns a generic success message (prevents email enumeration).
- [x] Hero SVGs wired: `Set Your Goals.svg` on `/goals`, `Supplements.svg` on dashboard empty state.

**Needs your action** (external to repo):
- [ ] Add `VYVATA_ADMIN_SECRET` to `.env.local` — admin console returns 401 until this is set. Generate with `openssl rand -hex 32`.
- [ ] Set `OPENAI_API_KEY` — enables GPT-4o synthesis path; without it the deterministic fallback runs. Sample 5–10 reports both ways to confirm quality lift before committing to the cost.
- [ ] Verify Resend sender domain — `hello@vyvata.com` is used in approval/recovery emails; check SPF/DKIM/DMARC are green in the Resend dashboard so mail doesn't go to spam.
- [ ] Add Sentry (or similar) runtime error reporting — create project, set `SENTRY_DSN`, wrap app with SDK. Deferred until real traffic.

### Phase 2 — Clinical depth ✅ Core Complete (2026-04-18)
Make the engine defensible.

- [x] Grow [ingredients-db.ts](src/lib/ingredients-db.ts) from 51 → **152** — covers vitamins, minerals, nootropics, adaptogens, medicinal mushrooms, amino acids, longevity compounds, sports performance
- [x] Expand rules engine: severity classification (critical/moderate/minor), synergies detection (Caffeine+L-Theanine, D3+K2, etc.), cycling recommendations (caffeine, racetams, etc.), enhanced goal-gap analysis
- [x] Build `protocols` table + named-template system ([migration](supabase/migrations/20260418_create_protocols_table.sql) + [TypeScript lib](src/lib/protocol-templates.ts)) with 5 seeded protocols: cognitive-performance-v1, deep-sleep-recovery-v1, athletic-performance-v1, longevity-foundation-v1, immune-support-v1
- [x] Ship evidence summaries library ([evidence-summaries.ts](src/lib/evidence-summaries.ts)) — 10 summaries (200-300 words, PubMed citations) for top ingredients, interactions, and protocols
- [ ] **UI wiring needed:** Connect evidence summaries to practitioner dashboard and protocol pages

**Metrics:**
- Ingredient count: 51 → 152 (3x expansion)
- Rules enhancements: severity classification, synergies (6 pairs), cycling (6 compounds), enhanced goal gaps (7 goals)
- Protocols: 5 canonical templates seeded, each with 4-7 ingredients, evidence summaries, dosing rationale, contraindications, monitoring advice
- Evidence library: 10 clinical summaries written (7 ingredients, 2 interactions, 1 protocol)

### Phase 3 — B2B growth (4–6 weeks)
Monetization and retention for practitioners.

- [ ] Patient notes, status transitions, CSV export
- [ ] PDF export of protocol reports (for patient handoff)
- [ ] Cohort analytics: distribution of goals/protocols/scores across a practitioner's panel
- [ ] Referral loop: `referrals` table, share links, attribution, credits
- [ ] Practitioner billing (Stripe) — tiered by patient count

### Phase 4 — Outcomes & data moat (6–12 weeks)
The thing that makes Vyvata defensible long-term.

- [ ] `outcomes` table: wearable ingest (Oura, Whoop, Apple Health)
- [ ] Follow-up protocol revisions based on measured outcomes
- [ ] B2C Pro subscription: monthly re-audit, delta report
- [ ] Anonymized population insights fed back into rules engine

### Phase 5 — Compliance & scale
Required before volume.

- [ ] HIPAA review if health data crosses threshold (BAA with Supabase, Resend, OpenAI; audit logs)
- [ ] End-to-end test suite (Playwright) covering the B2C + B2B golden paths
- [ ] Load testing on `/api/parse-stack` and `/api/unlock-report`
- [ ] Observability: structured logs, per-route latency, LLM cost tracking

---

## Business model (from README, confirmed)
- **B2C Free** — audit + teaser (✅ built)
- **B2C Pro** — full report + email delivery (✅ built; subscription layer in Phase 4)
- **B2B** — practitioner dashboard (✅ built; billing in Phase 3)
- **Phase 1 GTM** — DTC organic/paid → email capture → upsell

## Immediate next actions (my recommendation)
1. Phase 0 housekeeping — few hours, unblocks everything
2. Turn on OpenAI with a small test sample to verify report quality is materially better than fallback
3. Decide Phase 1 vs Phase 2 priority based on whether next traffic is B2C (Phase 2 matters) or practitioner pilots (Phase 1 security matters more)
