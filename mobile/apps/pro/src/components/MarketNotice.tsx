// "Not in your area yet" / "Coming soon" card with a one-tap waitlist (handoff §11.2, §11.6).
// Shared verbatim by apps/customer and apps/pro.
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { haptic } from "./ds";

export function WaitlistCard({
  title,
  body,
  trade,
  role,
  city,
}: {
  title: string;
  body: string;
  trade?: string;
  role: "CUSTOMER" | "PROVIDER";
  city?: string | null;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function join() {
    if (state === "busy" || state === "done") return;
    setState("busy");
    haptic.light();
    try {
      // Signed in: the backend uses the account's phone/email, so there is nothing to type.
      await api.joinWaitlist({ trade, role, city: city ?? undefined });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {state === "done" ? (
        <Text style={styles.done}>{t("market.onList")}</Text>
      ) : (
        <Pressable onPress={join} style={styles.button} accessibilityRole="button">
          {state === "busy" ? <ActivityIndicator color={colors.accentForeground} /> : <Text style={styles.buttonText}>{t("market.notifyMe")}</Text>}
        </Pressable>
      )}
      {state === "error" && <Text style={styles.error}>{t("common.tryAgain")}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 16, padding: 16, gap: 8 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  button: { marginTop: 6, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: colors.accentForeground, fontWeight: "800", fontSize: 14 },
  done: { color: colors.success, fontWeight: "700", fontSize: 13, marginTop: 4 },
  error: { color: colors.dangerSoft, fontSize: 12 },
});
