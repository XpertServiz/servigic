// "Invite friends, earn rewards" card (referral programme). Shared by apps/customer and apps/pro.
// Shows the user's code, what a successful invite is worth, how their invites are doing, and the referral
// earnings so far (customer credit that comes off a future job / pro wallet bonus).
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { haptic } from "./ds";

export function ReferralCard() {
  const { t } = useI18n();
  const [data, setData] = useState<api.ReferralSummary | null>(null);

  useEffect(() => {
    api
      .getReferral()
      .then(setData)
      .catch(() => setData(null)); // older backend: the card just stays hidden
  }, []);

  if (!data) return null;
  const isPro = data.role === "PROVIDER";

  async function share() {
    if (!data) return;
    haptic.light();
    try {
      await Share.share({ message: t(isPro ? "referral.shareMessagePro" : "referral.shareMessage", { code: data.code }) });
    } catch {
      // user dismissed the sheet
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("referral.title")}</Text>
      {data.enabled ? (
        <Text style={styles.body}>
          {isPro
            ? t("referral.proPitch", { amount: data.yourRewardPKR.toLocaleString(), jobs: data.jobsRequired })
            : t("referral.customerPitch", { amount: data.yourRewardPKR.toLocaleString() })}
        </Text>
      ) : (
        <Text style={styles.body}>{t("referral.off")}</Text>
      )}

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>{t("referral.codeLabel")}</Text>
        <Text style={styles.code} selectable>
          {data.code}
        </Text>
      </View>

      {data.enabled && (
        <Pressable onPress={share} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("referral.share")}</Text>
        </Pressable>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>PKR {data.earnedPKR.toLocaleString()}</Text>
          <Text style={styles.statLabel}>{t("referral.earned")}</Text>
        </View>
        {!isPro && (
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>PKR {data.availablePKR.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t("referral.available")}</Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.pendingCount}</Text>
          <Text style={styles.statLabel}>{t("referral.pendingLabel")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.releasedCount}</Text>
          <Text style={styles.statLabel}>{t("referral.rewardedLabel")}</Text>
        </View>
      </View>

      {isPro && data.earnedPKR > 0 && <Text style={styles.note}>{t("referral.proWalletNote")}</Text>}
      {!isPro && data.availablePKR > 0 && <Text style={styles.note}>{t("referral.customerCreditNote")}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 16, padding: 16, gap: 10 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  codeBox: { backgroundColor: colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.accentBorder, paddingVertical: 10, alignItems: "center" },
  codeLabel: { color: colors.textMuted, fontSize: 11 },
  code: { color: colors.accent, fontSize: 22, fontWeight: "800", letterSpacing: 2, marginTop: 2 },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: colors.accentForeground, fontWeight: "800", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: 10, padding: 9, alignItems: "center" },
  statValue: { color: colors.text, fontWeight: "800", fontSize: 13 },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" },
  note: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
});
