// AdMob ids for com.servigic.customer (created in the AdMob console 2026-10-12).
// NOT synced between apps — each app has its own file.
//
// Development, QA and the sideload .apk (EAS "preview" profile) use Google's
// official TEST units — loading real units while testing risks invalid-traffic
// flags on the account. Only the build submitted to Play (EAS "production"
// profile, which sets EXPO_PUBLIC_ADMOB_ENV=production) uses the real ids.
// The matching AdMob *app* id is chosen in app.config.js.
export const ADMOB_PRODUCTION = process.env.EXPO_PUBLIC_ADMOB_ENV === "production";

export const REAL_AD_UNITS = {
  native: "ca-app-pub-1826338688325435/9376406458", // Customer_Home_NativeSponsored
  // Console name is Customer_Jobs_RewardedBoost; behaviour is the PKR 50 booking discount.
  rewarded: "ca-app-pub-1826338688325435/6318078403",
  // The Customer app has no interstitial placement.
  interstitial: null,
} as const;
