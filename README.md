# Vyvata

**AI-powered trust engine for human optimization, longevity, and performance.**

Vyvata analyzes your supplement and health protocol stack, identifies what's working, what's wasted, and what's missing — then builds you a precision protocol grounded in clinical evidence.

See [ROADMAP.md](ROADMAP.md) for build status and phased plan.  
See [AGENTS-INDEX.md](AGENTS-INDEX.md) for specialized AI agents that accelerate development.

---

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4 + TypeScript + React 19
- **Backend:** Next.js API Routes (Edge + Node)
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4o (optional; deterministic fallback if no key)
- **Email:** Resend (optional; silently skipped if no key)
- **Icons:** lucide-react
- **Deploy:** Vercel

> **Note:** This is Next.js 16, not 15. APIs, conventions, and file structure may differ from older training data. See [AGENTS.md](AGENTS.md) and `node_modules/next/dist/docs/` when in doubt.

## Brand

- **Colors:** Deep Intelligence Blue `#0B1F3B` · Vital Energy Teal `#14B8A6` · Pure White `#FFFFFF`
- **Fonts:** Montserrat (headlines) · Inter (body/UI)
- **Aesthetic:** Apple / Verily / Whoop tier — clean, science-led, calm authority

## Routes

### Public (B2C)
| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, protocol cards, how-it-works |
| `/quiz` | Guided conversational intake (alternative to text input) |
| `/goals` | Goal selection (cognitive, sleep, performance, etc.) |
| `/processing` | Stack analysis animation → redirects to protocol |
| `/protocol/[slug]` | Full protocol result page (AI-generated, email-gated) |
| `/receipt/[slug]` | Legacy redirect → `/protocol/[slug]` |

### Practitioner (B2B)
| Route | Description |
|-------|-------------|
| `/practitioner` | Auth gate → login or dashboard |
| `/practitioner/login` | Email + access-code login |
| `/practitioner/register` | Multi-step signup (pending admin review) |
| `/practitioner/pending` | Application status / next steps |
| `/practitioner/dashboard` | Patient list, protocol distribution, top-protocol stat |
| `/practitioner/patients/[id]` | Per-patient audit + quiz detail |

### Admin
| Route | Description |
|-------|-------------|
| `/admin` | Applications review — approve/reject practitioner signups |

## API Routes

### Public
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse-stack` | POST | Parse supplement text, run rules engine, create audit |
| `/api/unlock-report` | POST | Accept email, generate full report, send email |
| `/api/quiz` | POST | Save quiz answers, compute protocol match score |
| `/api/audit/[slug]` | GET | Fetch public audit by slug |
| `/api/og` | GET | OG image generation (Edge runtime) |

### Practitioner
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/practitioner/register` | POST | Submit practitioner application |
| `/api/practitioner/auth` | POST/DELETE | Login / logout (email + access code, 7-day cookie) |
| `/api/practitioner/me` | GET | Current practitioner session |
| `/api/practitioner/verify` | POST | Email verification handler |
| `/api/practitioner/patients` | GET/POST | List / add patient links |
| `/api/practitioner/patients/[id]` | GET/PATCH/DELETE | Detail / edit notes / archive |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/applications` | GET | List practitioners grouped by verification status |
| `/api/admin/applications/[id]/approve` | POST | Approve application, issue access code |
| `/api/admin/applications/[id]/reject` | POST | Reject with reason |

## Database (Supabase)

| Table | Purpose | Wired? |
|-------|---------|:------:|
| `sessions` | Anonymous sessions — raw input, goals, ingredients | ✅ |
| `audits` | One per submission — score, teaser, report, public slug, email | ✅ |
| `users` | Email-identified users (created at unlock) | ✅ |
| `quiz_responses` | Structured intake questionnaire responses | ✅ |
| `practitioners` | Practitioner accounts for B2B channel | ✅ |
| `practitioner_sessions` | Session tokens for logged-in practitioners | ✅ |
| `patient_links` | Practitioner ↔ patient-audit relationships | ✅ |
| `protocols` | Named protocol templates | 🟡 provisioned, not yet wired |
| `outcomes` | Wearable data integration (future) | 🟡 provisioned, not yet wired |
| `referrals` | Viral loop tracking (future) | 🟡 provisioned, not yet wired |

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in credentials.

## Environment Variables

Required:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional:
```env
OPENAI_API_KEY=           # Falls back to deterministic report synthesis if unset
RESEND_API_KEY=           # Emails silently skipped if unset
VYVATA_ADMIN_SECRET=      # Gate for /admin and /api/admin/*
```

## Business Model

- **B2C Free:** Protocol audit, teaser insights
- **B2C Pro:** Full report, revised stack, email delivery
- **B2B:** Practitioner dashboard, white-label protocol engine, patient management
- **Phase 1 GTM:** DTC via organic/paid → email capture → protocol upsell
