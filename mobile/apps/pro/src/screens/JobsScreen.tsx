import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { SegmentedControl, EmptyState, PriceText } from "../components/ds";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<JobsStackParamList, "Jobs">;
type FeedJob = Awaited<ReturnType<typeof api.getProviderJobFeed>>["jobs"][number];
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

const POLL_MS = 15000;
type Segment = "AVAILABLE" | "BOOKED" | "DONE";
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "BOOKED", label: "Booked" },
  { value: "DONE", label: "Done" },
];
const BOOKED_STATUSES = ["CONFIRMED", "PENDING_PAYMENT", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];

export default function JobsScreen({ navigation }: Props) {
  const [segment, setSegment] = useState<Segment>("AVAILABLE");
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastCount = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [feed, { bookings: fetchedBookings }] = await Promise.all([api.getProviderJobFeed(), api.getMyBookings()]);
      if (feed.jobs.length > lastCount.current) {
        Notifications.scheduleNotificationAsync({
          content: { title: "New job available", body: "A job matching your trade just opened up.", sound: true },
          trigger: null,
        });
      }
      lastCount.current = feed.jobs.length;
      setJobs(feed.jobs);
      setIsOnline(feed.isOnline);
      setBookings(fetchedBookings);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load(true), POLL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => load(true));
    return () => sub.remove();
  }, [load]);

  const bookedList = bookings.filter((b) => BOOKED_STATUSES.includes(b.status));
  const doneList = bookings.filter((b) => b.status === "COMPLETED");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>
        <Text style={styles.title}>Jobs</Text>
        <View style={{ marginTop: 12 }}>
          <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
        </View>
      </View>

      {segment === "AVAILABLE" && (
        <>
          {!isOnline && (
            <Card style={{ marginHorizontal: 16, marginBottom: 12, borderColor: colors.accent }}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>You&apos;re offline</Text>
              <Text style={{ color: colors.textMuted, marginTop: 2 }}>Go online from Home to receive alerts.</Text>
            </Card>
          )}
          <FlatList
            data={jobs}
            keyExtractor={(j) => j.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.accent} />}
            contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
            ListEmptyComponent={<EmptyState icon="📡" title="No matching jobs right now" subtitle="We'll alert you the moment one opens up." />}
            renderItem={({ item }) => (
              <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                      {item.categoryIcon} {item.title}
                    </Text>
                    <Badge label={item.urgency} tone={item.urgency === "EMERGENCY" ? "danger" : "accent"} />
                  </View>
                  <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                    {item.areaLabel} · {item.categoryName}
                    {item.alreadyBid ? " · Bid sent" : ""}
                  </Text>
                </Card>
              </Pressable>
            )}
          />
        </>
      )}

      {segment === "BOOKED" && (
        <FlatList
          data={bookedList}
          keyExtractor={(b) => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="🛠️" title="No booked jobs" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{item.categoryIcon} {item.jobTitle}</Text>
                  <Badge label={item.status.replace("_", " ")} tone="secondary" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.payoutPKR} size="sm" color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      {segment === "DONE" && (
        <FlatList
          data={doneList}
          keyExtractor={(b) => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="✅" title="No completed jobs yet" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{item.categoryIcon} {item.jobTitle}</Text>
                  <Badge label="Done" tone="muted" />
                </View>
                <View style={{ marginTop: 6 }}>
                  <PriceText pkr={item.payoutPKR} size="sm" color={colors.textMuted} />
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
