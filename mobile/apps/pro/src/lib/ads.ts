// AdMob integration (redesign spec §7). Shared verbatim by apps/customer and
// apps/pro.
//
// Principle: ads never sit on a screen where interrupting costs trust, money or
// safety. Placements are therefore opt-in per call site and live ONLY in:
//   • Home (both apps)            → native "Sponsored" strip      (AdSlots.tsx)
//   • Pro Jobs                    → opt-in rewarded video          (AdSlots.tsx)
//   • Pro Job Done → Jobs         → interstitial, once per session (below)
// Never on auth screens, OnTheWay / JobActive / LiveTracking, payment or
// bidding confirmation, or the job-posting form. Interstitials are never
// triggered by an inactivity timer.
//
// Ad unit ids live in adUnits.ts (per app): Google's TEST units everywhere except
// the production build submitted to Play, which uses the real AdMob units.
import { Platform } from "react-native";
import { ADMOB_PRODUCTION, REAL_AD_UNITS } from "./adUnits";

type AdsModule = typeof import("react-native-google-mobile-ads");

let cached: AdsModule | null | undefined;
/** The native ads module, or null where it isn't linked (Expo Go, web, a failed init). */
export function getAds(): AdsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-google-mobile-ads") as AdsModule;
  } catch (e) {
    console.warn("[ads] native module unavailable", e);
    cached = null;
  }
  return cached;
}

export function adUnit(kind: "native" | "interstitial" | "rewarded"): string | null {
  const ads = getAds();
  if (!ads || Platform.OS === "web") return null;
  // The real units were created for the Android apps; iOS stays on test units until iOS apps exist in AdMob.
  if (ADMOB_PRODUCTION && Platform.OS === "android") return REAL_AD_UNITS[kind] ?? null;
  return { native: ads.TestIds.NATIVE, interstitial: ads.TestIds.INTERSTITIAL, rewarded: ads.TestIds.REWARDED }[kind];
}

let initPromise: Promise<boolean> | null = null;

/**
 * Gathers consent (UMP, only shows a form where required) then initialises the
 * SDK. Safe to call repeatedly; resolves false if ads can't run, in which case
 * every placement quietly renders nothing.
 */
export function initAds(): Promise<boolean> {
  initPromise ??= (async () => {
    const ads = getAds();
    if (!ads) return false;
    try {
      try {
        await ads.AdsConsent.gatherConsent();
      } catch (e) {
        // Consent form not configured in the AdMob console yet — outside the
        // EEA/UK nothing is required, so carry on.
        console.warn("[ads] consent gathering skipped", e);
      }
      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await ads.default().initialize();
      return true;
    } catch (e) {
      console.warn("[ads] initialisation failed", e);
      return false;
    }
  })();
  return initPromise;
}

// ─── Interstitial: natural transition points only, once per session ───
let interstitialShown = false;
let preloaded: ReturnType<AdsModule["InterstitialAd"]["createForAdRequest"]> | null = null;
let preloadedReady = false;

/** Warm an interstitial ahead of the transition so showing it never blocks the UI. */
export async function preloadInterstitial() {
  if (interstitialShown || preloaded) return;
  const ads = getAds();
  const unitId = adUnit("interstitial");
  if (!ads || !unitId || !(await initAds())) return;
  try {
    const ad = ads.InterstitialAd.createForAdRequest(unitId);
    preloaded = ad;
    ad.addAdEventListener(ads.AdEventType.LOADED, () => {
      preloadedReady = true;
    });
    ad.addAdEventListener(ads.AdEventType.ERROR, () => {
      preloaded = null;
      preloadedReady = false;
    });
    ad.load();
  } catch (e) {
    console.warn("[ads] interstitial preload failed", e);
    preloaded = null;
  }
}

/**
 * Shows the preloaded interstitial if one is ready and none has been shown this
 * session. Resolves when the ad closes (or immediately when there is nothing to
 * show) — callers continue their navigation afterwards either way.
 */
export function showInterstitialOnce(): Promise<void> {
  const ads = getAds();
  if (!ads || interstitialShown || !preloaded || !preloadedReady) return Promise.resolve();
  const ad = preloaded;
  preloaded = null;
  preloadedReady = false;
  interstitialShown = true;
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    try {
      ad.addAdEventListener(ads.AdEventType.CLOSED, done);
      ad.addAdEventListener(ads.AdEventType.ERROR, done);
      ad.show().catch(done);
    } catch {
      done();
    }
  });
}
