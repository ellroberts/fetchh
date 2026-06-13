# ThreadCub — Replit Environment
<!-- Last synced: 2026-03-18 -->

## Overview
ThreadCub is an AI conversation management dashboard built with Next.js 16, Supabase, Tailwind CSS, and support for Stripe payments and AI APIs (Anthropic/OpenAI).

## Architecture
- **Framework**: Next.js 16.1.6 (App Router, webpack mode)
- **Auth & DB**: Supabase (SSR auth via `@supabase/ssr`)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Payments**: Stripe (optional)
- **AI**: Anthropic Claude + OpenAI (optional)
- **Email**: Resend (optional)

## Running the App
The app runs on **port 5000** via the "Start application" workflow:
```
npm run dev   # → next dev -p 5000 -H 0.0.0.0 --webpack
npm run start # → next start -p 5000 -H 0.0.0.0
```

## Key Files
- `app/` — Next.js App Router pages and API routes
- `components/` — Shared UI components
- `lib/` — Utility functions and Supabase clients
- `proxy.ts` — Request authentication proxy (Next.js 16; previously middleware.ts)
- `next.config.js` — Next.js configuration (includes Replit `allowedDevOrigins`)
- `contexts/` — React context providers

## Environment Variables (Secrets)
All secrets are managed via Replit Secrets. Required:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

Optional (features disabled without these):
- `SUPABASE_SERVICE_ROLE_KEY` — Admin DB access (credit system, user claiming)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Payments
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — AI features
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email

## Replit Migration Notes (from Vercel)
- Port changed to 5000, bound to 0.0.0.0
- `middleware.ts` renamed to `proxy.ts` with `proxy` named export (Next.js 16)
- `allowedDevOrigins` added to next.config.js for Replit iframe proxy
- Removed `eslint` key from next.config.js (unsupported in Next.js 16)
- Removed duplicate `app/api/conversations/claim/route.js` (kept .ts version)
- Sensitive keys removed from `.env.production` and moved to Replit Secrets

## Auth Flow (Important)
The Supabase auth client is configured with `cookieOptions: { sameSite: 'none', secure: true }` in `lib/supabase.js`. This is required because:
- The Replit workspace preview is a **cross-origin iframe** — modern browsers block `SameSite=Lax` cookies set inside cross-origin iframes
- `SameSite=None; Secure` allows the session cookie to persist even in the iframe context, so page refreshes on protected routes work

After login, the auth page uses `router.push('/dashboard')` (client-side navigation, not `window.location.href`) to preserve the in-memory Supabase session across the navigation. A full page reload at that point would lose the in-memory session if cookies hadn't yet been fully written.

### Proxy / Auth guard (`proxy.ts`)
- Protects `/dashboard`, `/conversations`, `/threads`, `/settings`, `/projects`, `/highlights`, `/import`, `/admin`
- Only checks if the user is authenticated (via `supabase.auth.getUser()`)
- Waitlist approval check is done **client-side** in the dashboard layout (`app/(dashboard)/layout.tsx`) — the anon key cannot read the `waitlist` table due to RLS, so null results from that query are treated as approved (fail-open)

### Known Missing Secrets
These features will throw 500 errors without their keys:
- `OPENAI_API_KEY` — AI embeddings / RAG search / insights generation
- `ANTHROPIC_API_KEY` — Claude-based AI features
- `SUPABASE_SERVICE_ROLE_KEY` — Admin operations, conversation claiming
- `STRIPE_*` — Payment/subscription features
- `RESEND_API_KEY` — Transactional email
