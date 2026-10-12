// Extends app.json. The only dynamic part: which AdMob *app* id is baked into the
// Android manifest. Google's test app id for dev/QA/preview builds; the real
// one only for the production build that is submitted to Play (see
// src/lib/adUnits.ts for the matching ad unit ids).
const TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const REAL_APP_ID = "ca-app-pub-1826338688325435~4438940394"; // com.servigic.pro

// iOS: no AdMob iOS app exists yet, so Google's test iOS app id is used for every build.
// Create the iOS app in AdMob, then replace this (the SDK crashes on iOS without one).
const IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

module.exports = ({ config }) => {
  const production = process.env.EAS_BUILD_PROFILE === "production" || process.env.EXPO_PUBLIC_ADMOB_ENV === "production";
  return {
    ...config,
    // Google Maps on iOS (needed for the amber map style): set GOOGLE_MAPS_IOS_API_KEY
    // in the build environment together with EXPO_PUBLIC_IOS_GOOGLE_MAPS=true.
    ios: {
      ...config.ios,
      ...(process.env.GOOGLE_MAPS_IOS_API_KEY ? { config: { ...config.ios?.config, googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY } } : {}),
    },
    plugins: (config.plugins ?? []).map((plugin) =>
      Array.isArray(plugin) && plugin[0] === "react-native-google-mobile-ads"
        ? [plugin[0], { ...plugin[1], androidAppId: production ? REAL_APP_ID : TEST_APP_ID, iosAppId: IOS_APP_ID }]
        : plugin
    ),
  };
};
