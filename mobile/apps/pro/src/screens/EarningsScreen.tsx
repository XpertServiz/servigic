import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as api from "../lib/api";
import { Card, Badge, Button } from "../components/ui";
import { PriceText, EmptyState } from "../components/ds";
import { HeaderActions } from "../components/HeaderActions";
import { colors, radius } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";
import { TopUpSheet } from "./TopUpSheet";

type Earnings = Awaited<ReturnType<typeof api.getProviderEarnings>>;

// Level 0 New · Level 1 Verified (CNIC + selfie) · Level 2 Trusted Pro (adds the optional police certificate).
const LADDER_KEYS = ["earnings.ladderNew", "earnings.ladderVerified", "earnings.ladderTrusted"] as const;

export default function EarningsScreen() {
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Earnings | null>(null);
  const [verificationLevel, setVerificationLevel] = useState(0);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const load = useCallback(() => {
    api.getProviderEarnings().then(setData).catch(() => {});
    api
      .getProviderProfile()
      .then(({ profile }) => {
        if (profile) setVerificationLevel(((profile as Record<string, unknown>).verificationLevel as number) ?? 0);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const keepPct = data.commissionPct ? 100 - data.commissionPct : 88;
  const tier = Math.min(verificationLevel, LADDER_KEYS.length - 1);
  const isWallet = Boolean(data.wallet);

  const ladderCard = (
    <View style={styles.panel}>
      <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>
        {t(LADDER_KEYS[tier])} · {t("common.level", { n: verificationLevel })}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${((tier + 1) / LADDER_KEYS.length) * 100}%` }]} />
      </View>
      {tier < LADDER_KEYS.length - 1 && (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>{t("earnings.reach", { level: t(LADDER_KEYS[tier + 1]) })}</Text>
      )}
    </View>
  );

  const profileValueCard = data.profileValue && (
    <View style={styles.panel}>
      <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>{t("earnings.profileValue")}</Text>
      <View style={{ flexDirection: "row", gap: 24 }}>
        <View>
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "800" }}>★ {data.profileValue.ratingAvg.toFixed(1)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t("account.rating")}</Text>
        </View>
        <View>
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "800" }}>{data.profileValue.jobsCompleted}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t("account.jobsDone")}</Text>
        </View>
      </View>
      <Text style={{ color: colors.textFainter, fontSize: 11, marginTop: 8 }}>{t("earnings.profileValueNote")}</Text>
    </View>
  );

  const Header = ({ children }: { children: React.ReactNode }) => (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t("earnings.title")}</Text>
        <HeaderActions />
      </View>
      {children}
    </View>
  );

  if (isWallet) {
    const wallet = data.wallet!;
    const debtPKR = Math.max(0, -wallet.balancePKR);
    const pct = wallet.ceilingPKR > 0 ? Math.min(100, Math.round((debtPKR / wallet.ceilingPKR) * 100)) : 0;
    const settled = wallet.balancePKR >= 0;

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <FlatList
          data={data.ledger ?? []}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 18, paddingTop: insets.top + 16, gap: 10 }}
          ListHeaderComponent={
            <Header>
              <View style={[styles.hero, !settled && { borderColor: "rgba(226,87,76,0.5)" }]}>
                <Text style={styles.heroLabel}>{settled ? t("earnings.settled") : t("earnings.youOwe")}</Text>
                <PriceText pkr={Math.abs(wallet.balancePKR)} size="xl" color={settled ? colors.secondary : colors.dangerSoft} />
              </View>

              {!settled && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.danger : pct >= 80 ? colors.accent : colors.secondary },
                      ]}
                    />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                    {t("earnings.ceiling", { debt: debtPKR.toLocaleString(), ceiling: wallet.ceilingPKR.toLocaleString() })}
                    {data.dispatchStatus === "SUSPENDED" ? ` · ${t("earnings.alertsPaused")}` : ""}
                  </Text>
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                <Button title={t("earnings.topUp")} onPress={() => setTopUpOpen(true)} />
              </View>

              <View style={styles.zeroLead}>
                <Text style={{ color: colors.secondary, fontWeight: "800", fontSize: 13 }}>{t("earnings.noLeadFees", { pct: keepPct })}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t("earnings.cashExplainer", { pct: data.commissionPct })}</Text>
              </View>

              {ladderCard}
              {profileValueCard}

              <Text style={styles.sectionTitle}>{t("earnings.ledger")}</Text>
            </Header>
          }
          ListEmptyComponent={<EmptyState icon="💰" title={t("earnings.noLedger")} />}
          renderItem={({ item }) => {
            const debit = item.type === "COMMISSION_DEBIT";
            return (
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontWeight: "600", flex: 1 }}>{item.jobTitle ?? item.memo ?? enumLabel(td, "ledger", item.type)}</Text>
                  <Text style={{ color: debit ? colors.dangerSoft : colors.secondary, fontWeight: "700" }}>
                    {debit ? "-" : "+"}PKR {item.amountPKR.toLocaleString()}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
        <TopUpSheet visible={topUpOpen} onClose={() => setTopUpOpen(false)} onSubmitted={load} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data.payouts ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 18, paddingTop: insets.top + 16, gap: 10 }}
        ListHeaderComponent={
          <Header>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{t("earnings.totalEarned")}</Text>
              <PriceText pkr={data.totalSent ?? 0} size="xl" color={colors.secondary} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Card style={{ flex: 1 }}>
                <PriceText pkr={data.totalQueued ?? 0} size="sm" color={colors.accent} />
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>{t("earnings.queued")}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={{ color: colors.secondary, fontSize: 20, fontWeight: "800" }}>{keepPct}%</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>{t("earnings.youKeep")}</Text>
              </Card>
            </View>

            <View style={styles.zeroLead}>
              <Text style={{ color: colors.secondary, fontWeight: "800", fontSize: 13 }}>{t("earnings.zeroLeads", { pct: keepPct })}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t("earnings.noPayToSee")}</Text>
            </View>

            {ladderCard}
            {profileValueCard}

            <Text style={styles.sectionTitle}>{t("earnings.payoutHistory")}</Text>
          </Header>
        }
        ListEmptyComponent={<EmptyState icon="💸" title={t("earnings.noPayouts")} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "600", flex: 1 }}>
                {item.categoryIcon} {item.jobTitle}
              </Text>
              <Badge label={enumLabel(td, "payout", item.status)} tone={item.status === "QUEUED" ? "accent" : "secondary"} />
            </View>
            <View style={{ marginTop: 6 }}>
              <PriceText pkr={item.amountPKR} size="sm" color={colors.textMuted} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { color: colors.text, fontSize: 23, fontWeight: "800" },
  hero: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.card, padding: 20 },
  heroLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  zeroLead: { marginTop: 12, backgroundColor: "rgba(30,194,139,0.08)", borderWidth: 1, borderColor: "rgba(30,194,139,0.4)", borderRadius: radius.card, padding: 14 },
  panel: { marginTop: 12, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.card, padding: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 20 },
});
