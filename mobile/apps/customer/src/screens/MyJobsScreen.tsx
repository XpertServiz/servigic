import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { TabsUnderline, EmptyState, PriceText } from "../components/ds";
import { colors } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";

type Props = NativeStackScreenProps<JobsStackParamList, "MyJobs">;
type Job = Awaited<ReturnType<typeof api.getMyJobs>>["jobs"][number];
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

type Segment = "OPEN" | "BOOKED" | "COMPLETED" | "CANCELLED";
const BOOKED_STATUSES = ["CONFIRMED", "PENDING_PAYMENT", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];

export default function MyJobsScreen({ navigation }: Props) {
  // How many requests are open and how many more can be posted (max 5 at a time).
  const [quota, setQuota] = React.useState<{ open: number; max: number; remaining: number } | null>(null);
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>("OPEN");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [{ jobs: fetchedJobs }, { bookings: fetchedBookings }] = await Promise.all([api.getMyJobs(), api.getMyBookings()]);
      api.getRequestQuota().then(setQuota).catch(() => {});
      setJobs(fetchedJobs);
      setBookings(fetchedBookings);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const bookedList = useMemo(() => bookings.filter((b) => BOOKED_STATUSES.includes(b.status)), [bookings]);
  const completedList = useMemo(() => bookings.filter((b) => b.status === "COMPLETED"), [bookings]);
  // Cancelled: bookings cancelled after acceptance, and requests cancelled before anyone was booked.
  const cancelledList = useMemo(
    () => [
      ...bookings.filter((b) => b.status === "CANCELLED").map((b) => ({ key: "b" + b.id, title: `${b.categoryIcon} ${b.jobTitle}`, bookingId: b.id as string | null, jobId: null as string | null })),
      ...jobs.filter((j) => j.status === "CANCELLED").map((j) => ({ key: "j" + j.id, title: `${j.category.icon} ${j.title}`, bookingId: null as string | null, jobId: j.id as string | null })),
    ],
    [bookings, jobs],
  );
  const openList = useMemo(() => jobs.filter((j) => j.status === "OPEN"), [jobs]);

  const segments: { value: Segment; label: string }[] = [
    { value: "OPEN", label: t("myjobs.open") },
    { value: "BOOKED", label: t("myjobs.booked") },
    { value: "COMPLETED", label: t("myjobs.completed") },
    { value: "CANCELLED", label: t("myjobs.cancelled") },
  ];
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />;
  const listStyle = { padding: 18, paddingTop: 16, gap: 10 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 16 }}>
        <Text style={styles.title}>{t("myjobs.title")}</Text>
        {quota && <Text style={styles.quota}>{t("request.counter", { open: quota.open, max: quota.max, remaining: quota.remaining })}</Text>}
        <TabsUnderline options={segments} value={segment} onChange={setSegment} />
      </View>

      {segment === "OPEN" && (
        <FlatList
          data={openList}
          keyExtractor={(j) => j.id}
          refreshControl={refresh}
          contentContainerStyle={listStyle}
          ListEmptyComponent={<EmptyState icon="📋" title={t("myjobs.noOpen")} subtitle={t("myjobs.noOpenSub")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 }}>
                    {item.category.icon} {item.title}
                  </Text>
                  <Badge label={t("myjobs.bids", { n: item._count.bids })} tone="accent" />
                </View>
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>{item.areaLabel}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      {segment === "BOOKED" && (
        <FlatList
          data={bookedList}
          keyExtractor={(b) => b.id}
          refreshControl={refresh}
          contentContainerStyle={listStyle}
          ListEmptyComponent={<EmptyState icon="🛠️" title={t("myjobs.noBooked")} subtitle={t("myjobs.noBookedSub")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 }}>
                    {item.categoryIcon} {item.jobTitle}
                  </Text>
                  <Badge label={enumLabel(td, "booking", item.status)} tone="secondary" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.totalPKR} size="sm" color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      {segment === "CANCELLED" && (
        <FlatList
          data={cancelledList}
          keyExtractor={(x) => x.key}
          refreshControl={refresh}
          contentContainerStyle={listStyle}
          ListEmptyComponent={<EmptyState icon="🚫" title={t("myjobs.noCancelled")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => (item.bookingId ? navigation.navigate("BookingDetail", { bookingId: item.bookingId }) : navigation.navigate("JobDetail", { jobId: item.jobId as string }))}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 }}>{item.title}</Text>
                  <Badge label={enumLabel(td, "booking", "CANCELLED")} tone="muted" />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      {segment === "COMPLETED" && (
        <FlatList
          data={completedList}
          keyExtractor={(b) => b.id}
          refreshControl={refresh}
          contentContainerStyle={listStyle}
          ListEmptyComponent={<EmptyState icon="✅" title={t("myjobs.noCompleted")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 }}>
                    {item.categoryIcon} {item.jobTitle}
                  </Text>
                  <Badge label={enumLabel(td, "booking", "COMPLETED")} tone="muted" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.totalPKR} size="sm" color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 23, fontWeight: "800", marginBottom: 4 },
  quota: { color: colors.textMuted, fontSize: 12.5, marginBottom: 14 },
});
