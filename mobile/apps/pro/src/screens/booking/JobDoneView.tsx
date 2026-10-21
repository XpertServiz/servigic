// "Job complete" layout (D3-JobDone). In the cash-after-job model the pro
// collects the money from the customer directly and Servigic's commission is
// settled from the wallet, so the headline is what to COLLECT (not an amount
// "added to the wallet"). In the legacy PROTECTED mode it shows the payout.
// The one full-screen interstitial in the whole app is shown from "Back to
// jobs" below — a natural transition point, once per session, never on a timer.
import { currencyCode } from "../../lib/currency";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowBackground, GradientButton } from "../../components/ds";
import { Icon } from "../../components/Icon";
import { colors } from "../../lib/theme";
import { preloadInterstitial, showInterstitialOnce } from "../../lib/ads";
import { useT } from "../../lib/i18n";
import type { BookingData } from "./types";

export function JobDoneView({ booking, onBackToJobs }: { booking: BookingData; onBackToJobs: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [leaving, setLeaving] = useState(false);
  const cash = booking.paymentMode !== "PROTECTED";
  const reward = booking.rewardDiscountPKR ?? 0;
  // Any customer discount (referral, rewarded ad) means you collect that much less in cash. Servigic funds it:
  // you still owe the full commission, and the discount amount is credited to your wallet, so your net is unchanged.
  const commission = booking.commissionPKR ?? booking.totalPKR - booking.payoutPKR;
  const pct = commission === 0 ? 0 : (booking.commissionPct ?? (booking.totalPKR > 0 ? Math.round((commission / booking.totalPKR) * 100) : 12));

  useEffect(() => {
    preloadInterstitial();
  }, []);

  async function backToJobs() {
    if (leaving) return;
    setLeaving(true);
    await showInterstitialOnce();
    onBackToJobs();
  }

  return (
    <View style={styles.root}>
      <GlowBackground cy="30%" opacity={0.12} />
      <View style={styles.center}>
        <View style={styles.check}>
          <Icon name="check" size={40} color={colors.accentForeground} />
        </View>
        <Text style={styles.title}>{t("done.title")}</Text>
        <Text style={styles.sub}>{t("done.subtitle", { job: booking.jobTitle, name: booking.otherPartyName })}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{cash ? t("done.collect") : t("done.payout")}</Text>
          <Text style={styles.amount}>PKR {(cash ? booking.totalPKR - reward : booking.payoutPKR).toLocaleString()}</Text>
          {cash && reward > 0 && <Text style={styles.rewardNote}>{t("done.rewardNote", { amount: reward })}</Text>}
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>{t("done.commission", { pct })}</Text>
              <Text style={styles.statValue}>{currencyCode()} {commission.toLocaleString()}</Text>
            </View>
            {cash && reward > 0 && (
              <View style={{ alignItems: "center" }}>
                <Text style={styles.statLabel}>{t("done.discountCredit")}</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>+{currencyCode()} {reward.toLocaleString()}</Text>
              </View>
            )}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statLabel}>{cash ? t("done.youKeep") : t("done.jobsTotal")}</Text>
              <Text style={styles.statValue}>{cash ? `PKR ${booking.payoutPKR.toLocaleString()}` : String(booking.jobsCompleted ?? "—")}</Text>
            </View>
          </View>
          {cash && <Text style={styles.note}>{t("done.cashNote")}</Text>}
        </View>

        <Text style={styles.waiting}>{t("done.waiting", { name: booking.otherPartyName })}</Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <GradientButton title={t("done.backToJobs")} onPress={backToJobs} disabled={leaving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 10,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  sub: { color: colors.textMuted, fontSize: 14, marginBottom: 24, textAlign: "center" },
  card: { width: "100%", backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: "rgba(245,166,35,0.2)", borderRadius: 16, padding: 20 },
  cardLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  amount: { color: colors.accent, fontSize: 30, fontWeight: "800" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  statValue: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 },
  note: { color: colors.textFainter, fontSize: 11, marginTop: 12, lineHeight: 16 },
  rewardNote: { color: colors.success, fontSize: 11, fontWeight: "700", marginTop: 6 },
  waiting: { marginTop: 20, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
