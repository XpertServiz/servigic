// "Never miss a job" setup. Offline or app-closed pros only hear about a job through a push notification, and
// many Android phones (Samsung, Xiaomi, Oppo, Vivo, Infinix, Tecno...) kill background apps. This screen walks
// the pro through the settings that matter:
//   1. allow notifications (Android 13+ runtime permission) and keep the "New job alerts" channel loud
//   2. set the app's battery usage to Unrestricted (opens the app's system page; we deliberately do NOT use the
//      REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission, which Play restricts)
//   3. Samsung: remove the app from "Sleeping apps" / "Deep sleeping apps"
//   4. send yourself a test alert, then lock the phone or swipe the app away to see that it really arrives.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Linking, Platform, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as Application from "expo-application";
import * as api from "../lib/api";
import { CHANNELS, getJobAlertChannelState } from "../lib/notifications";
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
  const [channelState, setChannelState] = useState<"ok" | "muted" | "missing" | "unknown">("unknown");
  const [testState, setTestState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const check = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotifOn(status === "granted");
      setChannelState(await getJobAlertChannelState());
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

  // The app's own page in system settings: Battery > Unrestricted lives here on every Android version.
  async function openAppSettings() {
    Linking.openSettings().catch(() => {});
  }

  async function openBatteryOptimizationList() {
    try {
      if (Platform.OS === "android") await Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
      else await Linking.openSettings();
    } catch {
      Linking.openSettings().catch(() => {});
    }
  }

  async function openChannelSettings() {
    try {
      await Linking.sendIntent("android.settings.CHANNEL_NOTIFICATION_SETTINGS", [
        { key: "android.provider.extra.APP_PACKAGE", value: Application.applicationId ?? "com.servigic.pro" },
        { key: "android.provider.extra.CHANNEL_ID", value: CHANNELS.newJob },
      ]);
    } catch {
      Linking.openSettings().catch(() => {});
    }
  }

  async function sendTest() {
    setTestState("busy");
    try {
      await api.sendTestJobAlert(15);
      setTestState("sent");
    } catch {
      setTestState("error");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: 40 + insets.bottom }}>
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
        {notifOn && channelState === "ok" && <Text style={[styles.done, { marginTop: 6 }]}>{t("neverMiss.channelOk")}</Text>}
        {notifOn && (channelState === "muted" || channelState === "missing") && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: colors.dangerSoft, fontSize: 12.5, lineHeight: 18 }}>{t("neverMiss.channelMuted")}</Text>
            <View style={{ marginTop: 8 }}>
              <Button title={t("neverMiss.openChannel")} variant="ghost" onPress={openChannelSettings} />
            </View>
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.step}>2 · {t("neverMiss.batteryTitle")}</Text>
        <Text style={styles.stepBody}>{t("neverMiss.batteryBody")}</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          <Button title={t("neverMiss.openAppInfo")} variant="ghost" onPress={openAppSettings} />
          <Button title={t("neverMiss.openBattery")} variant="ghost" onPress={openBatteryOptimizationList} />
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.step}>3 · {t("neverMiss.samsungTitle")}</Text>
        <Text style={styles.stepBody}>{t("neverMiss.samsungBody")}</Text>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.step}>4 · {t("neverMiss.testTitle")}</Text>
        <Text style={styles.stepBody}>{t("neverMiss.testBody")}</Text>
        <View style={{ marginTop: 10 }}>
          <Button title={t("neverMiss.testButton")} onPress={sendTest} loading={testState === "busy"} />
        </View>
        {testState === "sent" && <Text style={styles.done}>{t("neverMiss.testSent")}</Text>}
        {testState === "error" && <Text style={{ color: colors.dangerSoft, fontSize: 12.5, marginTop: 8 }}>{t("neverMiss.testFailed")}</Text>}
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
