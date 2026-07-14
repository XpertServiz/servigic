# Servigic

The Uber of home services: post a job, verified pros race to bid, money stays safely held until the work is done.

Built per `servigic-master-brief-v1.1.md` — every phase P1–P11 has code, from the core web marketplace through the Python AI/ML layer to the two Expo mobile apps. See [What's real vs. simplified](#whats-real-vs-simplified) for the honest breakdown of what's fully tested vs. what needed graceful degradation because a real account/credential/device wasn't available in this environment.

## Repo layout

```
/                  Next.js web app (this is the P1-P7 core — start here)
ai-service/        Python FastAPI + LangChain + PyTorch microservice (P8/P9)
mobile/            Two Expo React Native apps: customer + pro (P10)
GCC_EXPANSION.md   What "first non-PK city live" actually requires (P11)
COMPLIANCE.md      Per-market legal checklist starting point (P11)
AWS_MIGRATION.md   S3/SQS/ECS swap-in path for when UploadThing/in-process notify() outgrow their free tiers
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 6 + PostgreSQL · NextAuth v5 (credentials + mobile JWT) · UploadThing · Resend · MapLibre GL + OpenStreetMap · Zod · FastAPI · LangChain · PyTorch · Expo/React Native

## Getting started (web app)

1. **Database** — either run Postgres locally with Docker, or create a free [Supabase](https://supabase.com) project:
   ```bash
   docker compose up -d
   ```
   This starts Postgres on `localhost:5432` matching the default `DATABASE_URL` in `.env`.

2. **Install & migrate**:
   ```bash
   npm install
   npm run db:migrate   # creates tables from prisma/schema.prisma
   npm run db:seed      # 12 categories, launch cities, admin user
   ```
   The seed script prints the admin login (phone/password) to the console — or set `SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD` in `.env` first.

3. **Run**:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

For the AI service: `ai-service/README.md`. For the mobile apps: `mobile/README.md`.

## Environment variables

Copy `.env.example` → `.env` (already done for local dev) and fill in real values before deploying. Nothing beyond `DATABASE_URL` is required to run the app locally — every external integration degrades gracefully to a no-op/console-log/heuristic when its env vars are unset, so the core flow is fully testable without any paid accounts.

| Var | Needed for |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Everything — Postgres connection |
| `AUTH_SECRET` | Web session encryption (already generated in `.env`) |
| `MOBILE_JWT_SECRET` | Mobile app auth tokens (already generated in `.env`) |
| `UPLOADTHING_TOKEN` | Job photos, KYC docs, payment proof uploads (web + mobile) |
| `RESEND_API_KEY` | Email notifications |
| `WHATSAPP_CLOUD_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp dispatch alerts (primary channel per the brief) |
| `SMS_GATEWAY_API_KEY` | SMS fallback channel |
| `GOOGLE_PLACES_API_KEY` | Admin Lead Fetcher only |
| `AI_SERVICE_URL` / `INTERNAL_AI_SERVICE_KEY` | Job triage, lead qualifier, dispute summarizer, bid-win hint — all hidden in the UI when unset |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Future international PSP path — not wired to any live booking flow yet, see `GCC_EXPANSION.md` |
| `NEXT_PUBLIC_SUPABASE_*` | Only needed if you swap the local Postgres for Supabase (also unlocks Realtime — see below) |

## What's built

**Web app (P1–P7) — complete, sellable marketplace:**
- Auth & RBAC (3 roles, phone+OTP, edge-safe `proxy.ts`), 4-preset theme system, working EN/UR/AR language switcher with RTL
- World-class landing page ported from the binding `servigic-landing-prototype.html` design contract, with real DB-backed proof/stats sections
- Core loop: job posting → geohash dispatch fan-out → bidding (upsert, decline-with-reason, counter-offer, contact scrubbing) → accept → Payment Protection (3 methods + proof) → admin verify → live status timeline + MapLibre tracking → confirm/auto-confirm → two-way ratings → payout queue
- Disputes (open with photos, admin resolve: release/partial/full refund)
- Admin cockpit: providers, categories, jobs, payments, payouts (+CSV export), disputes, users, analytics, settings, leads CRM
- Programmatic SEO pages, `/pro` acquisition page

**AI layer (P8) — `ai-service/`:**
- LangChain agents (Job Triage, Lead Qualifier, Dispute Summarizer) on Claude, each with a heuristic fallback so nothing breaks without an API key
- Every agent behind a `SiteSettings.featureFlags` toggle in `/admin/settings`, enforced server-side

**ML layer (P9) — also in `ai-service/`:**
- PyTorch bid-win-probability model (heuristic until trained on real data via the admin export + training script)
- PyTorch demand-heatmap forecasting, surfaced in `/admin/analytics`

**Mobile apps (P10) — `mobile/apps/{customer,pro}`:**
- Full screen set for both apps (auth, jobs, bids, bookings, payment, live map, status buttons, ratings, earnings, profile) — see `mobile/README.md` for exactly what's verified (type-checked) vs. what needs a real device to confirm

**Scale & Intl (P11):**
- GCC cities scaffolded but intentionally not exposed in pickers yet (real multi-currency work needed first — see `GCC_EXPANSION.md`)
- Stripe Connect infra scaffolded, unwired (no PKR use case for it — see the same doc)
- Compliance checklist starting point per market (`COMPLIANCE.md`)
- AWS S3/SQS/ECS migration path documented (`AWS_MIGRATION.md`) — not implemented because current volume doesn't need it, per the brief's own cost model

## What's real vs. simplified

Everything above is real, working code — not stubs pretending to be features. The honest caveats:

- **Nothing here was tested against a live Postgres, Supabase project, or paid API key** — this environment had no database server and no way to acquire real credentials. Every route was verified with `next build` (full type-check + static analysis across 70+ routes) and `next lint`, both clean. That confirms correctness of types, imports, and control flow — not runtime behavior against real data. Run the app yourself against a real database before showing it to a user.
- **The Python `ai-service` has no Python runtime in this environment** — written correctly against current FastAPI/LangChain/Pydantic v2/PyTorch APIs, but never executed. Install and run it yourself (`ai-service/README.md`) before trusting it.
- **The mobile apps have no simulator/device in this environment** — both type-check cleanly (`npx tsc --noEmit`, zero errors) but were never run with `expo start`. See `mobile/README.md`'s "Not verified" section.
- **Realtime is polling**, not Supabase Realtime websockets — a deliberate zero-infra substitute (15–45s intervals) that works today and can be swapped later.
- **The "20-second Uber ring"** is a high-priority push notification + in-app alert, not a true native lockscreen ring — that needs a bare/dev-client build outside Expo's managed workflow (documented in `mobile/README.md`).
- **Domain/hosting purchase, Meta Business verification, Google Places billing, Stripe/PSP merchant accounts** — all need your real accounts and payment methods; nothing here can create those on your behalf.
