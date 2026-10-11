import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/lib/auth";
import { I18nProvider } from "./src/lib/i18n";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { configureApiClient } from "./src/lib/api";
import { applyGlobalFont } from "./src/lib/globalFont";
import { initAds } from "./src/lib/ads";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Guarded: this runs before any component mounts, so a native-module issue
// here (e.g. notifications not fully provisioned yet) must never be able to
// take down the whole app before it even has a chance to render.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn("[push] setNotificationHandler failed", e);
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// Configured at module load (not in an effect) so the first request fired by
// I18nProvider's geo-suggestion can't race ahead of it.
configureApiClient(API_URL);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      applyGlobalFont();
      SplashScreen.hideAsync().catch(() => {});
      // Consent + SDK init; placements stay empty until this resolves true.
      initAds();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </I18nProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
