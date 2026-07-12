# Servigic

The Uber of home services: post a job, verified pros race to bid, money stays protected in escrow until the work is done.

Built per `servigic-master-brief-v1.1.md`. This covers Phases P1–P7 of the brief's build plan (foundation through SEO/landing) — a complete, sellable marketplace. Phases P8–P11 (Python AI layer, PyTorch ML, mobile apps, international PSPs) are **not** built here — see [What's not built](#whats-not-built) below.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 6 + PostgreSQL · NextAuth v5 (credentials) · UploadThing · Resend · MapLibre GL + OpenStreetMap · Zod

## Getting started

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

## Environment variables

Copy `.env.example` → `.env` (already done for local dev) and fill in real values before deploying. Nothing beyond `DATABASE_URL` is required to run the app locally — every external integration (UploadThing, Resend, WhatsApp Cloud API, SMS gateway, Google Places, MapTiler) degrades gracefully to a no-op/console-log when its env vars are unset, so the core flow is fully testable without any paid accounts.

| Var | Needed for |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Everything — Postgres connection |
| `AUTH_SECRET` | Session encryption (already generated in `.env`) |
| `UPLOADTHING_TOKEN` | Job photos, KYC docs, payment proof uploads |
| `RESEND_API_KEY` | Email notifications |
| `WHATSAPP_CLOUD_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp dispatch alerts (primary channel per the brief) |
| `SMS_GATEWAY_API_KEY` | SMS fallback channel |
| `GOOGLE_PLACES_API_KEY` | Admin Lead Fetcher only |
| `NEXT_PUBLIC_SUPABASE_*` | Only needed if you swap the local Postgres for Supabase (also unlocks Realtime — see below) |

## What's built

- **Auth & RBAC**: 3 roles (customer/provider/admin), phone+OTP verification, edge-safe `proxy.ts` route protection split from the Prisma-backed `auth.ts`
- **Theme system**: 4 CSS-variable presets, admin-switchable, global (DB-driven, not per-browser)
- **i18n scaffold**: next-intl wired for en/ur/ar with RTL support in the root layout; not every string is translated yet (see below)
- **Landing page**: `servigic-landing-prototype.html` (the binding single-file design contract) ported to production React/Tailwind components, with real DB-backed proof/stats sections that hide below data thresholds
- **Core loop**: job posting → geohash-based dispatch fan-out → bidding (upsert, decline-with-reason, one counter-offer per bid, contact-info scrubbing) → accept → escrow payment (3 methods + proof upload) → admin verification → live status timeline with MapLibre tracking → confirm/auto-confirm → two-way ratings → payout queue
- **Disputes**: open with photos, admin resolution (release/partial/full refund)
- **Admin cockpit**: provider verification queue, categories, jobs, payments, payouts (+ CSV export), disputes, users, analytics (GMV, take rate, fill rate, time-to-first-bid, city heat), settings, leads CRM with Google Places fetcher
- **SEO**: programmatic `/services/[category]/[city]` pages with FAQ schema, `/pro` acquisition page with earnings calculator

## What's not built

These require real accounts/infrastructure or are explicitly later phases (P8–P11) in the brief — scoped out rather than faked:

- **Domain/hosting purchase** (servigic.com, Vercel, Supabase project) — needs your payment method
- **Realtime**: the dispatch feed and location tracking use polling (15–45s) as a pragmatic zero-infra substitute for Supabase Realtime; swap in real Supabase Realtime once you have a project
- **WhatsApp Cloud API / SMS gateway**: adapters are written and wired everywhere `notify()` is called, but need your Meta Business verification + gateway contract to actually send. Until then they log to the console
- **Python `ai-service`** (LangChain lead-qualifier/outreach agent, dispute summarizer, PyTorch bid-win-probability model) — P8/P9 in the brief, a separate Dockerized service
- **Mobile apps** (Expo React Native) — P10, a separate app
- **Automated PSP** (Safepay/PayFast/Stripe) — payment verification is manual-admin (as the brief specifies for MVP)
- **Full i18n**: infrastructure is in place but only the landing hero strings are translated; extending to every page is straightforward mechanical work
