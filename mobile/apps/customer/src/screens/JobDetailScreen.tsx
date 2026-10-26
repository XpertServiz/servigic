import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Badge } from "../components/ui";
import { PriceText, ProviderAvatar, SegmentedControl, EmptyState, haptic } from "../components/ds";
import { WaitingHero } from "../components/WaitingHero";
import { RequestManager } from "../components/RequestManager";
import { colors } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";

type Props = NativeStackScreenProps<HomeStackParamList, "JobDetail">;

interface BidView {
  id: string;
  proLabel: string;
  pricePKR: number;
  etaMinutes: number;
  /** The pro is finishing another job and will come after it. */
  afterCurrentJob?: boolean;
  message: string | null;
  estimatedPartsNote: string | null;
  status: string;
  ratingAvg: number;
  ratingCount: number;
  distanceBand: string;
}

// `code` is what the backend accepts (fixed English enum); `key` is the localized label.
const DECLINE_REASONS = [
  { code: "Too expensive", key: "decline.tooExpensive" },
  { code: "ETA too long", key: "decline.etaTooLong" },
  { code: "Low rating", key: "decline.lowRating" },
  { code: "Other", key: "decline.other" },
] as const;
type Sort = "PRICE" | "RATING" | "ETA";

export default function JobDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t, td } = useI18n();
  const { jobId } = route.params;
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [bids, setBids] = useState<BidView[]>([]);
  const [busyBidId, setBusyBidId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("PRICE");
  // "Waiting for bids" empty states (handoff section 11.2).
  const [notified, setNotified] = useState<number | null>(null);
  const [ageMin, setAgeMin] = useState(0);
  const [noBidsAfterMin, setNoBidsAfterMin] = useState(20);
  const [widening, setWidening] = useState(false);

  const load = useCallback(() => {
    api
      .getJobDetail(jobId)
      .then(({ job: j, bids: b, notifiedCount, noBidsAfterMin: wait }) => {
        setJob(j);
        setBids(b as unknown as BidView[]);
        setNotified(notifiedCount ?? null);
        setNoBidsAfterMin(wait ?? 20);
        setAgeMin(typeof j.createdAt === "string" ? Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 60000) : 0);
      })
      .catch(() => {});
  }, [jobId]);

  useFocusEffect(load);

  // While the job is open, keep the screen live: bids and the notified count appear without pulling to refresh.
  const jobOpen = job?.status === "OPEN";
  useEffect(() => {
    if (!jobOpen) return;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [jobOpen, load]);

  const sortedBids = useMemo(() => {
    const copy = [...bids];
    if (sort === "PRICE") copy.sort((a, b) => a.pricePKR - b.pricePKR);
    else if (sort === "RATING") copy.sort((a, b) => b.ratingAvg - a.ratingAvg);
    else copy.sort((a, b) => a.etaMinutes - b.etaMinutes);
    return copy;
  }, [bids, sort]);

  const sortOptions: { value: Sort; label: string }[] = [
    { value: "PRICE", label: t("bids.sortPrice") },
    { value: "RATING", label: t("bids.sortRating") },
    { value: "ETA", label: t("bids.sortEta") },
  ];

  async function accept(bidId: string) {
    setBusyBidId(bidId);
    try {
      const { booking } = await api.acceptBid(bidId);
      navigation.replace("BookingDetail", { bookingId: booking.id });
    } catch (e) {
      // 409: the job was already filled (e.g. accepted from another device) —
      // the server guarantees exactly one accepted bid per job.
      if (e instanceof api.ApiError && e.status === 409) load();
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("bids.acceptFailed"));
    } finally {
      setBusyBidId(null);
    }
  }

  function decline(bidId: string) {
    Alert.alert(
      t("bids.declineWhy"),
      undefined,
      DECLINE_REASONS.map((reason) => ({
        text: t(reason.key),
        onPress: async () => {
          setBusyBidId(bidId);
          try {
            await api.declineBid(bidId, reason.code);
            load();
          } finally {
            setBusyBidId(null);
          }
        },
      }))
    );
  }

  async function widen() {
    if (widening) return;
    setWidening(true);
    haptic.light();
    try {
      const res = await api.widenJobSearch(jobId);
      setNotified(res.notifiedCount);
      Alert.alert(t("waiting.widen"), t("waiting.widened", { n: res.newlyNotified }));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof api.ApiError && e.code === "MAX_RADIUS" ? t("waiting.maxWidened") : e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setWidening(false);
    }
  }

  if (!job) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const isOpen = job.status === "OPEN";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 + insets.bottom }}>
      <Text style={styles.title}>{job.title as string}</Text>
      <Text style={styles.desc}>{job.description as string}</Text>
      <Badge label={enumLabel(td, "job", job.status as string)} tone="muted" />
      {job.urgency === "EMERGENCY" && job.status === "OPEN" && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.dangerTint }}>
          <Text style={{ color: colors.danger, fontWeight: "800" }}>{"🚨 " + t("emergency.customerTitle")}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 4 }}>{t("emergency.customerBody")}</Text>
        </View>
      )}
      <RequestManager job={job} onChanged={load} onOpenBooking={(id) => navigation.navigate("BookingDetail", { bookingId: id })} onClosed={() => navigation.goBack()} />

      <View style={styles.sortRow}>
        <Text style={styles.sectionTitle}>{t("bids.title", { n: bids.length })}</Text>
        {bids.length > 1 && (
          <View style={{ width: 210 }}>
            <SegmentedControl options={sortOptions} value={sort} onChange={setSort} />
          </View>
        )}
      </View>

      {isOpen && notified !== null && notified > 0 && <WaitingHero count={notified} compact={bids.length > 0} />}
      {bids.length === 0 && isOpen && notified !== null && notified > 0 && (
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", marginBottom: 6 }}>{t("bids.notifyingSub")}</Text>
      )}
      {bids.length === 0 && isOpen && notified === 0 && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{t("waiting.noProsTitle")}</Text>
          <Text style={styles.noticeBody}>{t("waiting.noProsBody")}</Text>
        </View>
      )}
      {bids.length === 0 && isOpen && notified === null && <EmptyState icon="📡" title={t("bids.notifying")} subtitle={t("bids.notifyingSub")} />}
      {bids.length === 0 && isOpen && ageMin >= noBidsAfterMin && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{t("waiting.noBidsTitle")}</Text>
          <Text style={styles.noticeBody}>{t("waiting.noBidsBody")}</Text>
          <View style={{ marginTop: 10 }}>
            <Button title={t("waiting.widen")} onPress={widen} loading={widening} />
          </View>
        </View>
      )}

      {sortedBids.map((bid) => (
        <Card key={bid.id} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{t("bids.labor")}</Text>
              <PriceText pkr={bid.pricePKR} size="lg" color={colors.accent} />
            </View>
            <ProviderAvatar name={bid.proLabel} ratingAvg={bid.ratingAvg} size={40} />
          </View>
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 6 }}>{bid.proLabel}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 2, fontSize: 12 }}>
            {bid.ratingCount > 0 ? `${bid.ratingAvg.toFixed(1)}★` : t("bids.new")} · {bid.distanceBand} · {t("bids.eta", { n: bid.etaMinutes })}
          </Text>
          {bid.afterCurrentJob && <Text style={{ color: colors.accent, marginTop: 4, fontSize: 12, fontWeight: "700" }}>⏳ {t("bids.finishingOther")}</Text>}
          {bid.estimatedPartsNote && (
            <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 12, lineHeight: 17 }}>🔧 {t("bids.partsEstimate", { note: bid.estimatedPartsNote })}</Text>
          )}
          {bid.message && <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{bid.message}</Text>}
          {bid.status === "PENDING" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button title={t("common.accept")} onPress={() => accept(bid.id)} loading={busyBidId === bid.id} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={t("common.decline")} variant="ghost" onPress={() => decline(bid.id)} />
              </View>
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: 12, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14, padding: 14 },
  noticeTitle: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  noticeBody: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  desc: { color: colors.textSecondary, marginBottom: 10, lineHeight: 20 },
  sortRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 4, gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
