// "Never miss a job" setup (handoff §11.5 item 5). Offline or app-closed pros only hear about a job
// through a push notification, and many Android phones (Xiaomi, Oppo, Vivo, Infinix, Tecno...) kill
// background apps. This screen walks the pro through the two settings that matter:
//   1. allow notifications (Android 13+ runtime permission)
//   2. exempt the app from aggressive battery optimization (opens the system settings list;
//      we deliberately do NOT use the REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission, which Play restricts).
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Linking, Platform, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Button, Card } from "../components/ui";
import { GradientButton } from "../components/ds";
import { colors } from "../lib/theme";
import { navigationRef } from "../navigation/ref";
import { useI18n } from "../lib/i18n";

export const NEVER_MISS_SEEN_KEY = "servigic_never_miss_seen";

export async function hasSeenNeverMiss(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(NEVER_MISS_SEEN_KEY)) === "1";
  } catch {
    return true; // never nag if storage is broken
  }
}

export default function NeverMissJobScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [notifOn, setNotifOn] = useState(false);

  const check = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotifOn(status === "granted");
    } catch {
      setNotifOn(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
    // Coming back from system settings should refresh the tick.
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => sub.remove();
  }, [check]);

  async function finish() {
    await SecureStore.setItemAsync(NEVER_MISS_SEEN_KEY, "1").catch(() => {});
    if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
  }

  async function allowNotifications() {
    try {
      const res = await Notifications.requestPermissionsAsync();
      if (res.status === "granted") setNotifOn(true);
      else await Linking.openSettings(); // already denied once: Android will not ask again
    } catch {
      Linking.openSettings().catch(() => {});
    }
  }

  async function openBatterySettings() {
    try {
      if (Platform.OS === "android") await Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
      else await Linking.openSettings();
    } catch {
      Linking.openSettings().catch(() => {});
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: 40 }}>
      <Text style={styles.emoji}>🔔</Text>
      <Text style={styles.title}>{t("neverMiss.title")}</Text>
      <Text style={styles.body}>{t("neverMiss.body")}</Text>

      <Card style={{ marginTop: 18 }}>
        <Text style={styles.step}>1 · {t("neverMiss.notifTitle")}</Text>
        <Text style={styles.stepBody}>{t("neverMiss.notifBody")}</Text>
        {notifOn ? (
          <Text style={styles.done}>{t("neverMiss.notifDone")}</Text>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Button title={t("neverMiss.notifTitle")} onPress={allowNotifications} />
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.step}>2 · {t("neverMiss.batteryTitle")}</Text>
        <Text style={styles.stepBody}>{t("neverMiss.batteryBody")}</Text>
        <View style={{ marginTop: 10 }}>
          <Button title={t("neverMiss.openSettings")} variant="ghost" onPress={openBatterySettings} />
        </View>
      </Card>

      <View style={{ marginTop: 22, gap: 10 }}>
        <GradientButton title={t("neverMiss.done")} onPress={finish} />
        <Button title={t("neverMiss.later")} variant="ghost" onPress={finish} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 40 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 8 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  step: { color: colors.text, fontSize: 15, fontWeight: "800" },
  stepBody: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  done: { color: colors.success, fontWeight: "700", fontSize: 13, marginTop: 10 },
});
