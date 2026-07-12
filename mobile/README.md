# Servigic Mobile (P10)

Two Expo apps sharing the same Next.js backend as the web app — no backend duplication, per the master brief (§10).

- `apps/customer` — post jobs, compare bids, pay into escrow, track live, rate
- `apps/pro` — go online, dispatch feed, bid, navigate, status buttons, earnings
- `packages/api-client/src/index.ts` — canonical copy of the API client (see note below)

## Setup

```bash
cd mobile/apps/customer   # or apps/pro
npm install               # already done if you're reading this from the delivered repo
cp .env.example .env      # set EXPO_PUBLIC_API_URL to your machine's LAN IP, not localhost
npx expo start
```

Scan the QR code with Expo Go, or run `npx expo start --android` / `--ios` with a simulator.

The backend (`../../` — the Next.js app) must be running and reachable at `EXPO_PUBLIC_API_URL`. On a physical device, `localhost` means the phone itself, not your computer — use your LAN IP (`http://192.168.x.x:3000`) or a tunnel (`npx expo start --tunnel`, or `ngrok http 3000`).

## Auth architecture

Mobile doesn't use NextAuth's cookie-based session (no persistent cookie jar across app restarts in React Native). Instead:

- `POST /api/mobile/auth/login` issues a 30-day JWT (see `src/lib/mobileAuth.ts` in the web app)
- The app stores it in `expo-secure-store` and sends `Authorization: Bearer <token>` on every request
- `src/lib/requireRole.ts` in the web app resolves *either* a session cookie *or* a Bearer JWT — so every existing API route (jobs, bids, bookings, provider profile, etc.) works for mobile with zero per-route changes. Only a handful of mobile-only **read** endpoints exist (`/api/mobile/jobs/[id]`, `/api/mobile/bookings/[id]`, `/api/mobile/provider/jobs`, etc.) because the web app serves those reads via server components instead of JSON APIs.

## What's real vs. simplified here

**Real and working** (as far as static analysis can confirm — see "not verified" below):
- Full auth flow (signup → OTP → login → JWT persistence)
- Job posting with photos, category picker, geolocation
- Bid comparison, accept/decline/counter
- Escrow payment with proof photo upload
- Live status timeline, map (react-native-maps + Apple/Google Maps)
- Location pings while ON_MY_WAY (provider) and polling display (customer)
- Two-way ratings
- Push notifications via Expo's push service (works with zero FCM/APNs setup)
- AI bid-win-probability hint on the bid form

**Simplified vs. the brief, on purpose:**
- **The "20-second Uber ring."** True full-screen-intent, locked-screen ringing (like an incoming call) needs a bare workflow / custom dev client with native Android `USE_FULL_SCREEN_INTENT` + a foreground service, and iOS VoIP-push entitlements — both explicitly called out in the brief as needing native modules beyond Expo's managed workflow (§8, §10, §15 risk table). What's shipped: a high-priority Android notification channel with sound/vibration, and a foreground in-app "new job" alert while the feed screen is open. Upgrading to true lockscreen ringing is a scoped follow-up, not a gap in understanding — it requires `npx expo prebuild` (or EAS dev client) and platform-specific native code this environment can't produce or test.
- **Shared API client isn't a real npm workspace package.** `packages/api-client/src/index.ts` is the source of truth; `apps/customer/src/lib/api.ts` and `apps/pro/src/lib/api.ts` are exact copies. Metro's handling of TypeScript files inside linked workspace packages needs config (`watchFolders`, `resolver.nodeModulesPaths`) that couldn't be verified end-to-end without running `expo start` against a real device/simulator in this environment. Copying is unglamorous but guaranteed to work; wiring a real workspace is a safe follow-up once you can test it locally.
- **Turn-by-turn navigation** is a deep link to Google Maps (`Linking.openURL` with a `google.com/maps/dir` URL) per the brief's explicit "free" recommendation — no in-app routing.
- **Chat** isn't in the mobile apps yet (it's in the web app). The API (`getMessages`/`sendMessage`) is already in the shared client; wiring a screen is mechanical.

## Not verified

This environment has Node/npm (so `npx tsc --noEmit` ran clean for both apps — confirms types, imports, and navigation param wiring are all correct) but **no Android/iOS simulator, no physical device, and no way to run `expo start` end-to-end**. Treat this as "compiles and type-checks correctly" rather than "confirmed working on a device" — run it yourself before trusting it in front of a user. If something doesn't render right, it's much more likely a styling/UX issue than a wiring bug, since the data flow was checked at the type level.

## EAS builds (when you're ready)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

You'll need an Expo account (free) and, for production, Apple/Google developer accounts ($99/yr + $25 one-time — see brief §10, §11).
