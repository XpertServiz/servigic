import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "JobFeed">;
type FeedJob = Awaited<ReturnType<typeof api.getProviderJobFeed>>["jobs"][number];

const POLL_MS = 15000;

export default function JobFeedScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastCount = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api.getProviderJobFeed();
      if (data.jobs.length > lastCount.current) {
        // New job(s) arrived while the feed was open — a real Uber-style
        // full-screen ring needs a bare/dev-client native module (locked
        // screen + 20s looping tone); this foreground alert is the closest
        // Expo managed-workflow equivalent. See mobile/README.md.
        Notifications.scheduleNotificationAsync({
          content: { title: "New job available", body: "A job matching your trade just opened up.", sound: true },
          trigger: null,
        });
      }
      lastCount.current = data.jobs.length;
      setJobs(data.jobs);
      setIsOnline(data.isOnline);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      {!isOnline && (
        <Card style={{ marginBottom: 12, borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>You&apos;re offline</Text>
          <Text style={{ color: colors.textMuted, marginTop: 2 }}>Go online from the dashboard to receive alerts.</Text>
        </Card>
      )}
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.accent} />}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>No matching jobs right now.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
            <Card style={{ marginBottom: 10 }}>
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
    </View>
  );
}
