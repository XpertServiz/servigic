import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Badge } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;
type Job = Awaited<ReturnType<typeof api.getMyJobs>>["jobs"][number];

export default function DashboardScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { jobs: fetched } = await api.getMyJobs();
      setJobs(fetched);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Button title="Post a Job →" onPress={() => navigation.navigate("PostJob")} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <Text style={styles.link} onPress={() => navigation.navigate("Bookings")}>
          Bookings
        </Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Profile")}>
          Profile
        </Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>No jobs yet — post your first job.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{item.title}</Text>
                <Badge label={item.status.replace("_", " ")} tone={item.status === "OPEN" ? "accent" : "muted"} />
              </View>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                {item.areaLabel} · {item._count.bids} bid{item._count.bids === 1 ? "" : "s"}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.accent, fontWeight: "700" },
});
