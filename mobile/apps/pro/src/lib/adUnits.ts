// AdMob ids for com.servigic.pro (created in the AdMob console 2026-10-12).
// NOT synced between apps — each app has its own file.
//
// Development, QA and the sideload .apk (EAS "preview" profile) use Google's
// official TEST units — loading real units while testing risks invalid-traffic
// flags on the account. Only the build submitted to Play (EAS "production"
// profile, which sets EXPO_PUBLIC_ADMOB_ENV=production) uses the real ids.
// The matching AdMob *app* id is chosen in app.config.js.
export const ADMOB_PRODUCTION = process.env.EXPO_PUBLIC_ADMOB_ENV === "production";

export const REAL_AD_UNITS = {
  native: "ca-app-pub-1826338688325435/2578318956", // Pro_Home_NativeSponsored
  rewarded: "ca-app-pub-1826338688325435/2586802674", // Pro_Jobs_RewardedBoost (reward: VisibilityBoost)
  interstitial: "ca-app-pub-1826338688325435/2714795181", // Pro_JobDone_Interstitial
} as const;
