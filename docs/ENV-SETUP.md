# Environment Variable Setup Guide

This guide walks you through obtaining and configuring all environment variables for Vyvata.

---

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in required values (see sections below)

3. Restart your dev server:
   ```bash
   npm run dev
   ```

---

## Required Variables

### 1. Supabase

**Where to get:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings > API**

**Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  # "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      # "service_role" key
```

**Security:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose (public)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose (public, RLS-protected)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - **NEVER expose to client** (bypasses RLS)

---

### 2. Admin Secret

**Generate:**
```bash
openssl rand -hex 32
```

**Or online:**
- Visit: https://generate-secret.vercel.app/32

**Variable:**
```bash
VYVATA_ADMIN_SECRET=64-character-hex-string-here
```

**Usage:**
- Required for `/admin` login
- Entered on admin login page
- Stored in httpOnly cookie after login

---

## Optional Variables (Recommended)

### 3. OpenAI (GPT-4o for Protocol Reports)

**Where to get:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new secret key

**Variable:**
```bash
OPENAI_API_KEY=sk-proj-...
```

**Without this:**
- App uses deterministic fallback
- Reports work but are less personalized
- No LLM costs

**With this:**
- GPT-4o generates personalized protocol reports
- ~$0.01-0.03 per report
- Better user experience

**Test both:**
1. Generate 5 reports without OpenAI key
2. Add key and generate 5 reports with GPT-4o
3. Compare quality to decide if cost is worth it

---

### 4. Resend (Email Delivery)

**Where to get:**
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create API key
3. Verify domain `vyvata.com` in **Domains** section

**Variable:**
```bash
RESEND_API_KEY=re_...
```

**Usage:**
- Practitioner approval emails
- Access code recovery emails
- Sender: `hello@vyvata.com`

**Without this:**
- Emails silently fail (logged but not sent)
- Approval workflow still works (practitioner can check dashboard)
- Recovery flow returns success but no email sent

**Domain Verification:**
1. Add TXT, MX, CNAME records to DNS
2. Verify SPF, DKIM, DMARC are green in Resend
3. Test with sandbox mode first

---

## Future Variables (Phase 3-4)

### 5. Stripe (Practitioner Billing - Phase 3)

**Where to get:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Use **test mode** for development

**Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe CLI or dashboard
```

**Not needed until:**
- Phase 3 practitioner billing implementation
- Currently not wired in codebase

---

### 6. Sentry (Error Tracking - Optional)

**Where to get:**
1. Go to [Sentry](https://sentry.io)
2. Create project for Next.js
3. Copy DSN from project settings

**Variables:**
```bash
SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
NEXT_PUBLIC_SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
```

**Usage:**
- Runtime error tracking
- Performance monitoring
- Deferred until production traffic

---

### 7. Wearable Integrations (Phase 4)

**Oura Ring:**
```bash
OURA_CLIENT_ID=...
OURA_CLIENT_SECRET=...
```

**Whoop:**
```bash
WHOOP_CLIENT_ID=...
WHOOP_CLIENT_SECRET=...
```

**Not needed until:**
- Phase 4 outcomes + wearable ingest

---

## Development Flags

### Enable Verbose Logging
```bash
DEBUG=true
```

### Skip Rate Limiting (Local Only)
```bash
SKIP_RATE_LIMIT=true
```

### Mock LLM (No OpenAI Costs)
```bash
MOCK_LLM=true
```

---

## Verification

### Check Supabase Connection
```bash
npm run dev
# Visit http://localhost:3000/practitioner/login
# Try logging in with demo credentials: demo@vyvata.com / DEMO-2026
```

### Check OpenAI (if set)
```bash
# Complete the quiz at http://localhost:3000/quiz
# Check terminal logs for "Using OpenAI synthesis" vs "Using deterministic fallback"
```

### Check Admin Auth
```bash
# Visit http://localhost:3000/admin
# Enter your VYVATA_ADMIN_SECRET
# Should see applications dashboard
```

### Check Resend (if set)
```bash
# Trigger practitioner recovery: http://localhost:3000/practitioner/recover
# Check Resend dashboard > Logs for email delivery
```

---

## Common Issues

### "Supabase URL is not defined"
- **Fix:** Ensure `NEXT_PUBLIC_SUPABASE_URL` is set in `.env.local`
- **Restart:** dev server after adding

### "401 Unauthorized" on admin routes
- **Fix:** Set `VYVATA_ADMIN_SECRET` in `.env.local`
- **Check:** No extra spaces or quotes in the value

### LLM always uses fallback
- **Fix:** Set `OPENAI_API_KEY=sk-proj-...`
- **Verify:** Key has credits at https://platform.openai.com/usage

### Emails not sending
- **Fix:** Set `RESEND_API_KEY` and verify domain
- **Check:** Resend dashboard > Logs for delivery status

---

## Production Deployment (Vercel)

### Add Variables to Vercel
1. Go to project settings > Environment Variables
2. Add each variable from `.env.local`
3. Set scope: Production, Preview, Development (as needed)

### Variables by Scope

**Production + Preview + Development:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VYVATA_ADMIN_SECRET`

**Production Only:**
- `OPENAI_API_KEY` (use separate key from dev)
- `RESEND_API_KEY` (production mode)
- `STRIPE_SECRET_KEY` (live mode, Phase 3)
- `SENTRY_DSN` (production monitoring)

**Development Only:**
- `DEBUG=true`
- `SKIP_RATE_LIMIT=true`

### Redeploy
```bash
git push origin main
# Vercel auto-deploys
```

---

## Security Best Practices

✅ **DO:**
- Use separate API keys for dev/staging/production
- Rotate secrets quarterly
- Use Vercel's encrypted environment variables
- Enable 2FA on all third-party services

❌ **DON'T:**
- Commit `.env.local` to git
- Share secrets in Slack/Discord
- Use production keys in development
- Hardcode secrets in source code

---

## Quick Reference

| Variable | Required | Phase | Service |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | 0 | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | 0 | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | 0 | Supabase |
| `VYVATA_ADMIN_SECRET` | ✅ Yes | 1 | Custom |
| `OPENAI_API_KEY` | ⚠️ Recommended | 0 | OpenAI |
| `RESEND_API_KEY` | ⚠️ Recommended | 1 | Resend |
| `STRIPE_SECRET_KEY` | ❌ Future | 3 | Stripe |
| `SENTRY_DSN` | ❌ Optional | 5 | Sentry |
| `OURA_CLIENT_ID` | ❌ Future | 4 | Oura |

---

**Need Help?**
- Check `.env.example` for format examples
- See ROADMAP.md for phase information
- Review service documentation links above
