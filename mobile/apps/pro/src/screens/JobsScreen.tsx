import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Badge } from "../components/ui";
import { TabsUnderline, EmptyState, PriceText } from "../components/ds";
import { RewardedBoostCard } from "../components/AdSlots";
import { VerificationNotice } from "../components/VerificationNotice";
import { colors } from "../lib/theme";
import { enumLabel, tradeLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";

type Props = NativeStackScreenProps<JobsStackParamList, "Jobs">;
type FeedJob = Awaited<ReturnType<typeof api.getProviderJobFeed>>["jobs"][number];
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

const POLL_MS = 15000;
type Segment = "AVAILABLE" | "BOOKED" | "DONE";
const BOOKED_STATUSES = ["CONFIRMED", "PENDING_PAYMENT", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <View style={[styles.iconBox, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ width: "62%", height: 11, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.09)" }} />
          <View style={{ width: "40%", height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.05)" }} />
        </View>
      </View>
      <View style={{ height: 34, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.04)", marginTop: 12 }} />
    </View>
  );
}

export default function JobsScreen({ navigation }: Props) {
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>("AVAILABLE");
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [boostedUntil, setBoostedUntil] = useState<string | null>(null);
  const [launchingSoon, setLaunchingSoon] = useState<string | null>(null);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [verified, setVerified] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New-job alerting itself is handled app-wide by the ring overlay in
  // RootNavigator (works from any tab) — this screen just renders the list.
  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [feed, { bookings: fetchedBookings }] = await Promise.all([api.getProviderJobFeed(), api.getMyBookings()]);
      setJobs(feed.jobs);
      setIsOnline(feed.isOnline);
      setBoostedUntil(feed.boostedUntil ?? null);
      setLaunchingSoon(feed.launchingSoon?.area ?? null);
      setPhotoRequired(Boolean(feed.photoRequired));
      setBookings(fetchedBookings);
      api
        .getProviderProfile()
        .then(({ profile }) => setVerified((((profile as Record<string, unknown> | null)?.verificationLevel as number) ?? 0) >= 1))
        .catch(() => {});
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load(true), POLL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  const boostActive = !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
  const bookedList = bookings.filter((b) => BOOKED_STATUSES.includes(b.status));
  const doneList = bookings.filter((b) => b.status === "COMPLETED");

  const segments: { value: Segment; label: string }[] = [
    { value: "AVAILABLE", label: t("jobs.available") },
    { value: "BOOKED", label: t("jobs.booked") },
    { value: "DONE", label: t("jobs.done") },
  ];

  async function claimBoost() {
    const { boostedUntil: until } = await api.claimVisibilityBoost();
    setBoostedUntil(until);
  }

  const listPadding = { paddingHorizontal: 18, paddingBottom: 24, gap: 12 };
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.accent} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 16 }}>
        <Text style={styles.title}>{t("jobs.title")}</Text>
        <TabsUnderline options={segments} value={segment} onChange={setSegment} />
      </View>

      {segment === "AVAILABLE" && (
        <FlatList
          data={loaded ? jobs : []}
          keyExtractor={(j) => j.id}
          refreshControl={refresh}
          contentContainerStyle={[listPadding, { paddingTop: 16 }]}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {!verified && <VerificationNotice />}
              {!isOnline && (
                <View style={styles.offlineCard}>
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("jobs.offlineTitle")}</Text>
                  <Text style={{ color: colors.textMuted, marginTop: 2, fontSize: 12 }}>{t("jobs.offlineBody")}</Text>
                </View>
              )}
              <RewardedBoostCard active={boostActive} onReward={claimBoost} />
            </View>
          }
          ListEmptyComponent={
            loaded ? (photoRequired ? <EmptyState icon="📸" title={t("profile.photoRequiredTitle")} subtitle={t("profile.photoRequiredBody")} /> : <EmptyState icon={launchingSoon ? "🚀" : "📡"} title={launchingSoon ? t("jobs.launchingSoon", { area: launchingSoon }) : t("jobs.emptyTitle")} subtitle={launchingSoon ? t("jobs.launchingSoonSub") : t("jobs.emptySubtitle")} />) : <View style={{ gap: 12 }}><SkeletonCard /><SkeletonCard /></View>
          }
          renderItem={({ item, index }) => (
            <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
              <View style={[styles.card, index === 0 && !item.alreadyBid && styles.cardHighlight]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 9, flex: 1 }}>
                    <View style={styles.iconBox}>
                      <Text style={{ fontSize: 14 }}>{item.categoryIcon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {item.areaLabel} · {tradeLabel(t, (item as { categoryTrade?: string }).categoryTrade, item.categoryName)}
                      </Text>
                    </View>
                  </View>
                  {item.budgetPKR ? (
                    <Text style={[styles.price, index === 0 && !item.alreadyBid && { color: colors.accent }]}>PKR {item.budgetPKR.toLocaleString()}</Text>
                  ) : (
                    <Badge label={enumLabel(td, "urgency", item.urgency)} tone={item.urgency === "EMERGENCY" ? "danger" : "accent"} />
                  )}
                </View>
                {item.alreadyBid ? (
                  <View style={styles.bidSent}>
                    <Text style={styles.bidSentText}>{t("jobs.bidSent")}</Text>
                  </View>
                ) : (
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>{t("jobs.viewAndBid")}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      {segment === "BOOKED" && (
        <FlatList
          data={bookedList}
          keyExtractor={(b) => b.id}
          refreshControl={refresh}
          contentContainerStyle={[listPadding, { paddingTop: 16 }]}
          ListEmptyComponent={<EmptyState icon="🛠️" title={t("jobs.noBooked")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.cardTitle}>
                    {item.categoryIcon} {item.jobTitle}
                  </Text>
                  <Badge label={enumLabel(td, "booking", item.status)} tone="secondary" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.payoutPKR} size="sm" color={colors.textMuted} />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {segment === "DONE" && (
        <FlatList
          data={doneList}
          keyExtractor={(b) => b.id}
          refreshControl={refresh}
          contentContainerStyle={[listPadding, { paddingTop: 16 }]}
          ListEmptyComponent={<EmptyState icon="✅" title={t("jobs.noDone")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.cardTitle}>
                    {item.categoryIcon} {item.jobTitle}
                  </Text>
                  <Badge label={enumLabel(td, "booking", "COMPLETED")} tone="muted" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.payoutPKR} size="sm" color={colors.textMuted} />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 23, fontWeight: "800", marginBottom: 16 },
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    padding: 15,
  },
  cardHighlight: { borderColor: "rgba(245,166,35,0.3)", shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 22, elevation: 3 },
  iconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(245,166,35,0.14)", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  cardSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: colors.text, fontSize: 15, fontWeight: "800" },
  cta: { marginTop: 12, backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 11, alignItems: "center" },
  ctaText: { color: colors.accentForeground, fontWeight: "800", fontSize: 14 },
  bidSent: { marginTop: 11, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  bidSentText: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
  offlineCard: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14, padding: 13 },
});
