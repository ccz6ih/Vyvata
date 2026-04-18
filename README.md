# Vyvata

**AI-powered trust engine for human optimization, longevity, and performance.**

Vyvata analyzes your supplement and health protocol stack, identifies what's working, what's wasted, and what's missing — then builds you a precision protocol grounded in clinical evidence.

---

## Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS v4 + TypeScript
- **Backend:** Next.js API Routes (Edge + Node)
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend
- **Deploy:** Vercel

## Brand

- **Colors:** Deep Intelligence Blue `#0B1F3B` · Vital Energy Teal `#14B8A6` · Pure White `#FFFFFF`
- **Fonts:** Montserrat (headlines) · Inter (body/UI)
- **Aesthetic:** Apple / Verily / Whoop tier — clean, science-led, calm authority

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, protocol cards, how-it-works, practitioners |
| `/goals` | Goal selection (cognitive, sleep, performance, etc.) |
| `/processing` | Stack analysis animation → redirects to protocol |
| `/protocol/[slug]` | Full protocol result page (AI-generated, gated) |
| `/receipt/[slug]` | Legacy redirect → `/protocol/[slug]` |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/parse-stack` | Parses supplement text input, runs rules engine, creates audit |
| `POST /api/unlock-report` | Accepts email, generates full report, sends Vyvata protocol email |
| `GET /api/og` | Generates OG image for social sharing |
| `GET /api/audit/[slug]` | Fetches public audit data by slug |

## Database (Supabase)

| Table | Purpose |
|-------|---------|
| `sessions` | Anonymous sessions — raw input, goals, ingredients |
| `audits` | One per submission — score, teaser, report, public slug, email |
| `users` | Email-identified users (created at unlock) |
| `protocols` | Named protocol templates (cognitive, sleep, inflammation) |
| `practitioners` | Practitioner accounts for B2B channel |
| `quiz_responses` | Structured intake questionnaire responses |
| `outcomes` | Wearable data integration (Pro tier) |
| `referrals` | Viral loop tracking |

## Development

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in Supabase credentials.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Business Model

- **B2C Free:** Protocol audit, teaser insights
- **B2C Pro:** Full report, revised stack, email delivery
- **B2B:** Practitioner dashboard, white-label protocol engine, patient management
- **Phase 1 GTM:** DTC via organic/paid → email capture → protocol upsell
