import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Badge } from "../components/ui";
import { PriceText, ProviderAvatar, SegmentedControl, EmptyState } from "../components/ds";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "JobDetail">;

interface BidView {
  id: string;
  proLabel: string;
  pricePKR: number;
  etaMinutes: number;
  message: string | null;
  status: string;
  ratingAvg: number;
  ratingCount: number;
  distanceBand: string;
}

const DECLINE_REASONS = ["Too expensive", "ETA too long", "Low rating", "Other"];
type Sort = "PRICE" | "RATING" | "ETA";
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "PRICE", label: "Price" },
  { value: "RATING", label: "Rating" },
  { value: "ETA", label: "ETA" },
];

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [bids, setBids] = useState<BidView[]>([]);
  const [busyBidId, setBusyBidId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("PRICE");

  const load = useCallback(() => {
    api.getJobDetail(jobId).then(({ job: j, bids: b }) => {
      setJob(j);
      setBids(b as unknown as BidView[]);
    });
  }, [jobId]);

  useFocusEffect(load);

  const sortedBids = useMemo(() => {
    const copy = [...bids];
    if (sort === "PRICE") copy.sort((a, b) => a.pricePKR - b.pricePKR);
    else if (sort === "RATING") copy.sort((a, b) => b.ratingAvg - a.ratingAvg);
    else copy.sort((a, b) => a.etaMinutes - b.etaMinutes);
    return copy;
  }, [bids, sort]);

  async function accept(bidId: string) {
    setBusyBidId(bidId);
    try {
      const { booking } = await api.acceptBid(bidId);
      navigation.replace("BookingDetail", { bookingId: booking.id });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to accept bid");
    } finally {
      setBusyBidId(null);
    }
  }

  function decline(bidId: string) {
    Alert.alert(
      "Why are you declining?",
      undefined,
      DECLINE_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          setBusyBidId(bidId);
          try {
            await api.declineBid(bidId, reason);
            load();
          } finally {
            setBusyBidId(null);
          }
        },
      }))
    );
  }

  if (!job) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{job.title as string}</Text>
      <Text style={styles.desc}>{job.description as string}</Text>
      <Badge label={(job.status as string).replace("_", " ")} tone="muted" />

      <View style={styles.sortRow}>
        <Text style={styles.sectionTitle}>Bids ({bids.length})</Text>
        {bids.length > 1 && (
          <View style={{ width: 200 }}>
            <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} />
          </View>
        )}
      </View>

      {bids.length === 0 && (
        <EmptyState icon="📡" title="Notifying nearby pros…" subtitle="Bids will start racing in shortly." />
      )}

      {sortedBids.map((bid) => (
        <Card key={bid.id} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <PriceText pkr={bid.pricePKR} size="lg" color={colors.accent} />
            <ProviderAvatar name={bid.proLabel} ratingAvg={bid.ratingAvg} size={40} />
          </View>
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 6 }}>{bid.proLabel}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 2, fontSize: 12 }}>
            {bid.ratingCount > 0 ? `${bid.ratingAvg.toFixed(1)}★` : "New"} · {bid.distanceBand} · ETA {bid.etaMinutes} min
          </Text>
          {bid.message && <Text style={{ color: colors.textMuted, marginTop: 6 }}>{bid.message}</Text>}
          {bid.status === "PENDING" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button title="Accept" onPress={() => accept(bid.id)} loading={busyBidId === bid.id} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Decline" variant="ghost" onPress={() => decline(bid.id)} />
              </View>
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  desc: { color: colors.textMuted, marginBottom: 10 },
  sortRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 4 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
