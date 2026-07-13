import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { SegmentedControl, EmptyState, PriceText } from "../components/ds";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<JobsStackParamList, "MyJobs">;
type Job = Awaited<ReturnType<typeof api.getMyJobs>>["jobs"][number];
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

type Segment = "OPEN" | "BOOKED" | "COMPLETED";
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "BOOKED", label: "Booked" },
  { value: "COMPLETED", label: "Completed" },
];
const BOOKED_STATUSES = ["CONFIRMED", "PENDING_PAYMENT", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];

export default function MyJobsScreen({ navigation }: Props) {
  const [segment, setSegment] = useState<Segment>("OPEN");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [{ jobs: fetchedJobs }, { bookings: fetchedBookings }] = await Promise.all([
        api.getMyJobs(),
        api.getMyBookings(),
      ]);
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
  const openList = useMemo(() => jobs.filter((j) => j.status === "OPEN"), [jobs]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>
        <Text style={styles.title}>My Jobs</Text>
        <View style={{ marginTop: 12 }}>
          <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
        </View>
      </View>

      {segment === "OPEN" && (
        <FlatList
          data={openList}
          keyExtractor={(j) => j.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="📋" title="No open jobs" subtitle="Post a job to start getting bids." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                    {item.category.icon} {item.title}
                  </Text>
                  <Badge label={`${item._count.bids} bid${item._count.bids === 1 ? "" : "s"}`} tone="accent" />
                </View>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.areaLabel}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      {segment === "BOOKED" && (
        <FlatList
          data={bookedList}
          keyExtractor={(b) => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="🛠️" title="No booked jobs" subtitle="Accepted bids will show up here." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                    {item.categoryIcon} {item.jobTitle}
                  </Text>
                  <Badge label={item.status.replace("_", " ")} tone="secondary" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.totalPKR} size="sm" color={colors.textMuted} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="✅" title="No completed jobs yet" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                    {item.categoryIcon} {item.jobTitle}
                  </Text>
                  <Badge label="Done" tone="muted" />
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
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
});
