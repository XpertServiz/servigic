// Things the admin controls from Admin > Settings, with no app release: the announcement banner, the
// "please update" gate for old versions, and the support button. Shared by apps/customer and apps/pro.
import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MarketConfig } from "../lib/api";
import { loadMarketConfig } from "../lib/market";
import { APP_ROLE } from "../lib/appRole";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { GradientButton } from "./ds";

type AppControls = NonNullable<MarketConfig["app"]>;

/** The admin-controlled values (null until loaded, or when the server is older / unreachable: the app then behaves as before). */
export function useAppControls(): AppControls | null {
  const [controls, setControls] = useState<AppControls | null>(null);
  useEffect(() => {
    let alive = true;
    loadMarketConfig(null).then((cfg) => alive && setControls(cfg?.app ?? null));
    return () => {
      alive = false;
    };
  }, []);
  return controls;
}

/** Shows a blocking "please update" screen when this build is older than the minimum the admin set. */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const controls = useAppControls();
  const mine = Number(Application.nativeBuildVersion ?? 0) || 0;
  const tooOld = controls != null && controls.minVersionCode > 0 && mine > 0 && mine < controls.minVersionCode;
  if (!tooOld) return <>{children}</>;

  const role: string = APP_ROLE; // widened: this shared file is compiled in both apps, where APP_ROLE is a different literal
  const url = role === "PROVIDER" ? controls.storeUrls.pro : controls.storeUrls.customer;
  return (
    <View style={[styles.gate, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={{ fontSize: 44 }}>⬆️</Text>
      <Text style={styles.gateTitle}>{t("update.title")}</Text>
      <Text style={styles.gateBody}>{t("update.body")}</Text>
      {url ? <GradientButton title={t("update.button")} onPress={() => Linking.openURL(url)} /> : <Text style={styles.gateBody}>{t("update.noLink")}</Text>}
    </View>
  );
}

const DISMISSED_KEY = "servigic_announcement_dismissed";

/** The admin's announcement, at the top of the home screen. Dismissing hides that exact message (a new one shows again). */
export function AnnouncementCard() {
  const t = useT();
  const controls = useAppControls();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    SecureStore.getItemAsync(DISMISSED_KEY)
      .then(setDismissed)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const a = controls?.announcement;
  if (!ready || !a || (a.audience !== "ALL" && a.audience !== (APP_ROLE as string))) return null;
  const signature = `${a.title}|${a.body}`;
  if (dismissed === signature) return null;
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        {!!a.title && <Text style={styles.cardTitle}>{a.title}</Text>}
        {!!a.body && <Text style={styles.cardBody}>{a.body}</Text>}
      </View>
      <Pressable
        onPress={() => {
          setDismissed(signature);
          SecureStore.setItemAsync(DISMISSED_KEY, signature).catch(() => {});
        }}
        hitSlop={10}
        accessibilityRole="button"
      >
        <Text style={styles.dismiss}>{t("announcement.gotIt")}</Text>
      </Pressable>
    </View>
  );
}

/** "Contact support" row: opens WhatsApp chat with the number the admin set. Hidden when no number is set. */
export function SupportRow({ rowStyle, textStyle }: { rowStyle: object; textStyle: object }) {
  const t = useT();
  const controls = useAppControls();
  if (!controls?.supportWhatsapp) return null;
  return (
    <Pressable onPress={() => Linking.openURL(`https://wa.me/${controls.supportWhatsapp}`)} style={rowStyle} accessibilityRole="button">
      <Text style={{ fontSize: 16 }}>💬</Text>
      <Text style={textStyle}>{t("support.contact")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  gateTitle: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  gateBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14, padding: 14 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  cardBody: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  dismiss: { color: colors.accent, fontWeight: "800", fontSize: 12 },
});
