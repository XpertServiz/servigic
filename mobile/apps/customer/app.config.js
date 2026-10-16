// Extends app.json. The only dynamic part: which AdMob *app* id is baked into the
// Android manifest. Google's test app id for dev/QA/preview builds; the real
// one only for the production build that is submitted to Play (see
// src/lib/adUnits.ts for the matching ad unit ids).
const TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const REAL_APP_ID = "ca-app-pub-1826338688325435~6973604391"; // com.servigic.customer

// iOS: no AdMob iOS app exists yet, so Google's test iOS app id is used for every build.
// Create the iOS app in AdMob, then replace this (the SDK crashes on iOS without one).
const IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

const fs = require("fs");
const path = require("path");

// Android push notifications are delivered by Firebase Cloud Messaging. Without a google-services.json the app can
// never obtain a push token, so NO push (voice alerts included) reaches a closed or locked phone. Provide the file
// (from Firebase console > Project settings > your Android app) as ./google-services.json or via the
// GOOGLE_SERVICES_JSON environment variable (a path), which CI sets from a repository secret.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  (fs.existsSync(path.join(__dirname, "google-services.json")) ? "./google-services.json" : undefined);

module.exports = ({ config }) => {
  const production = process.env.EAS_BUILD_PROFILE === "production" || process.env.EXPO_PUBLIC_ADMOB_ENV === "production";
  return {
    ...config,
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
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
