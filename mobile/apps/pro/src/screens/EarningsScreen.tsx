import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as api from "../lib/api";
import { Card, Badge, Button } from "../components/ui";
import { PriceText, EmptyState } from "../components/ds";
import { colors, radius } from "../lib/theme";
import { TopUpSheet } from "./TopUpSheet";

type Earnings = Awaited<ReturnType<typeof api.getProviderEarnings>>;

const LADDER_LABELS = ["New", "Verified", "Trusted Pro"];

export default function EarningsScreen() {
  const [data, setData] = useState<Earnings | null>(null);
  const [verificationLevel, setVerificationLevel] = useState(0);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const load = useCallback(() => {
    api.getProviderEarnings().then(setData);
    api.getProviderProfile().then(({ profile }) => {
      if (profile) setVerificationLevel(((profile as Record<string, unknown>).verificationLevel as number) ?? 0);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return null;

  const keepPct = data.commissionPct ? 100 - data.commissionPct : 88;
  const tier = Math.min(verificationLevel, LADDER_LABELS.length - 1);
  const isWallet = Boolean(data.wallet);

  const ladderCard = (
    <View style={styles.ladderCard}>
      <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>
        {LADDER_LABELS[tier]} · Level {verificationLevel}
      </Text>
      <View style={styles.ladderTrack}>
        <View style={[styles.ladderFill, { width: `${((tier + 1) / LADDER_LABELS.length) * 100}%` }]} />
      </View>
      {tier < LADDER_LABELS.length - 1 && (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
          Complete more jobs to reach {LADDER_LABELS[tier + 1]}
        </Text>
      )}
    </View>
  );

  const profileValueCard = data.profileValue && (
    <View style={styles.profileValueCard}>
      <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>Your Servigic profile value</Text>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View>
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "800" }}>★ {data.profileValue.ratingAvg.toFixed(1)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>Rating</Text>
        </View>
        <View>
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "800" }}>{data.profileValue.jobsCompleted}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>Jobs done</Text>
        </View>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8 }}>
        Every on-platform job builds this — it&apos;s your business&apos;s track record, not counted anywhere off-app.
      </Text>
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
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.title}>Earnings</Text>

              <View style={[styles.heroCard, !settled && { borderColor: colors.danger }]}>
                <Text style={styles.heroLabel}>{settled ? "Wallet settled ✓" : "You owe Servigic"}</Text>
                <PriceText pkr={Math.abs(wallet.balancePKR)} size="xl" color={settled ? colors.secondary : colors.danger} />
              </View>

              {!settled && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.ladderTrack}>
                    <View
                      style={[
                        styles.ladderFill,
                        { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.danger : pct >= 80 ? colors.accent : colors.secondary },
                      ]}
                    />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                    PKR {debtPKR.toLocaleString()} of PKR {wallet.ceilingPKR.toLocaleString()} debt ceiling
                    {data.dispatchStatus === "SUSPENDED" && " · job alerts paused"}
                  </Text>
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                <Button title="Top Up" onPress={() => setTopUpOpen(true)} />
              </View>

              <View style={styles.zeroLeadCard}>
                <Text style={{ color: colors.secondary, fontWeight: "800", fontSize: 13 }}>No lead fees · you keep {keepPct}%</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  You collect full payment from the customer. Just {data.commissionPct}% commission on completed jobs,
                  settled from your wallet.
                </Text>
              </View>

              {ladderCard}
              {profileValueCard}

              <Text style={styles.sectionTitle}>Ledger</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="💰" title="No ledger entries yet" />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{item.jobTitle ?? item.memo ?? item.type}</Text>
                <Text style={{ color: item.type === "COMMISSION_DEBIT" ? colors.danger : colors.secondary, fontWeight: "700" }}>
                  {item.type === "COMMISSION_DEBIT" ? "-" : "+"}PKR {item.amountPKR.toLocaleString()}
                </Text>
              </View>
            </Card>
          )}
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
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.title}>Earnings</Text>

            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Total earned</Text>
              <PriceText pkr={data.totalSent ?? 0} size="xl" color={colors.secondary} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Card style={{ flex: 1 }}>
                <PriceText pkr={data.totalQueued ?? 0} size="sm" color={colors.accent} />
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>Queued</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={{ color: colors.secondary, fontSize: 20, fontWeight: "800" }}>{keepPct}%</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>You keep</Text>
              </Card>
            </View>

            <View style={styles.zeroLeadCard}>
              <Text style={{ color: colors.secondary, fontWeight: "800", fontSize: 13 }}>
                PKR 0 spent on leads · you keep {keepPct}%
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>No pay-to-see-jobs, ever.</Text>
            </View>

            {ladderCard}
            {profileValueCard}

            <Text style={styles.sectionTitle}>Payout history</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="💸" title="No payouts yet" />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {item.categoryIcon} {item.jobTitle}
              </Text>
              <Badge label={item.status} tone={item.status === "QUEUED" ? "accent" : "secondary"} />
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
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 14 },
  heroCard: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 20,
  },
  heroLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  zeroLeadCard: {
    marginTop: 12,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radius.card,
    padding: 14,
  },
  ladderCard: {
    marginTop: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  profileValueCard: {
    marginTop: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  ladderTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  ladderFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 20 },
});
