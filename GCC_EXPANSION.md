# GCC & International Expansion (P11)

Status: **not live**. `src/lib/markets.ts` lists Dubai/Riyadh/Jeddah as `COMING_SOON` and they're shown greyed-out in `/admin/categories` — that's the entire footprint today. This document is the checklist for actually turning one on, per Master Brief §11 ("First non-PK city live" exit criteria).

## Why this isn't a config flag

Every money-bearing field in the schema is PKR-specific by name: `Job.budgetPKR`, `Bid.pricePKR`, `Booking.totalPKR`/`commissionPKR`/`payoutPKR`, `Payment.amountPKR`, `Payout.amountPKR`. Flipping a city to live without addressing currency would silently create AED/SAR jobs priced as if they were PKR — a real financial bug, not a cosmetic one. That's why the city pickers only ever show `LIVE_CITIES`.

## What "first GCC city live" actually requires

1. **Currency field + FX-safe storage.** Add a `currency` enum and rename/generalize the `*PKR` fields (or add parallel `amountMinor` + `currency` columns, storing minor units to avoid float rounding — the PKR fields can stay as a Pakistan-specific view). Every price display, commission calc (`Math.round(price * pct / 100)` in `src/app/api/bids/[id]/accept/route.ts`), and CSV export (`src/app/api/admin/payouts/export/route.ts`) needs to become currency-aware.
2. **Local payment methods.** JazzCash/EasyPaisa don't exist in the UAE/KSA. Needs local rails (e.g. UAE: Telr/PayTabs/Stripe; KSA: mada via a local PSP) or Stripe (`src/lib/payments/stripe.ts` is scaffolded, unwired — see its comments for the exact hookup point in `/api/webhooks/stripe`).
3. **Notification channels.** WhatsApp Cloud API works region-agnostically, but the Lead Fetcher / outreach bot is explicitly Pakistan-only per Master Brief §9 compliance note — do not port it to GCC numbers without new legal review (that section calls out that international acquisition should use paid social + referral instead).
4. **RTL is already done for Arabic.** `src/i18n/request.ts` → `RTL_LOCALES` includes `ar`, the root layout sets `dir="rtl"` automatically, and `messages/ar.json` has the landing page hero/nav strings. Extending translation coverage to every page (dashboard, admin, etc.) is the remaining mechanical work — most of those still render English strings directly rather than through `next-intl`.
5. **Verification ladder per market.** CNIC + police-verification certificate (`ProviderProfile.cnicUrl`/`policeCertUrl`) are Pakistan documents. GCC needs local ID + labor-card equivalents — see `COMPLIANCE.md`.
6. **Geocoding/maps** already work anywhere (MapLibre + OSM tiles, Haversine distance) — no changes needed there.
7. **Provider agreement / dispute language** should be reviewed per-market (see `COMPLIANCE.md`).

## Suggested order

Riyadh or Dubai first (larger Urban Company-proven market per the brief's competitor analysis in §2.1), single trade cluster (plumber/electrician/AC, mirroring the Karachi launch approach in §15), after items 1–2 above are done — everything else can follow incrementally.
