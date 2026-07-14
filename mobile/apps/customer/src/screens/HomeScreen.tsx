import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { Chip } from "../components/ds";
import { colors, radius } from "../lib/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;
type Category = Awaited<ReturnType<typeof api.getCategories>>["categories"][number];
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getCategories()
      .then(({ categories: fetched }) => setCategories(fetched))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load categories"))
      .finally(() => setLoading(false));
    api
      .getMyBookings()
      .then(({ bookings }) => {
        const active = bookings.find((b) => ACTIVE_BOOKING_STATUSES.includes(b.status));
        setActiveBooking(active ?? null);
      })
      .catch(() => setActiveBooking(null));
  }, []);

  useFocusEffect(load);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.headerSub}>What do you need fixed today?</Text>
        </View>

        {activeBooking && (
          <Pressable
            onPress={() => navigation.navigate("BookingDetail", { bookingId: activeBooking.id })}
            style={styles.activeCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.activeLabel}>Active job</Text>
              <Text style={styles.activeTitle} numberOfLines={1}>
                {activeBooking.jobTitle}
              </Text>
            </View>
            <Badge label={activeBooking.status.replace("_", " ")} tone="secondary" />
          </Pressable>
        )}

        <View style={styles.heroRow}>
          <Pressable style={styles.heroCard} onPress={() => navigation.navigate("PostJob")}>
            <Text style={styles.heroPlus}>＋</Text>
            <Text style={styles.heroTitle}>Post a Job</Text>
            <Text style={styles.heroSub}>Get bids from verified pros in minutes</Text>
          </Pressable>
          <Pressable
            style={styles.emergencyChip}
            onPress={() => navigation.navigate("PostJob", { urgency: "EMERGENCY" })}
          >
            <Text style={styles.emergencyIcon}>⚡</Text>
            <Text style={styles.emergencyText}>Emergency</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Browse trades</Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: colors.danger, textAlign: "center", marginBottom: 12 }}>{error}</Text>
            <Chip label="Try again" onPress={load} />
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(c) => c.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            columnWrapperStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.tile}
                onPress={() => navigation.navigate("PostJob", { categoryId: item.id })}
              >
                <Text style={styles.tileIcon}>{item.icon}</Text>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  greeting: { color: colors.text, fontSize: 24, fontWeight: "800" },
  headerSub: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radius.card,
    padding: 14,
  },
  activeLabel: { color: colors.secondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  activeTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
  heroRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 18, marginBottom: 22 },
  heroCard: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    padding: 18,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroPlus: { fontSize: 26, fontWeight: "800", color: colors.accentForeground },
  heroTitle: { fontSize: 18, fontWeight: "800", color: colors.accentForeground, marginTop: 4 },
  heroSub: { fontSize: 12, color: "rgba(10,11,15,0.75)", marginTop: 6, fontWeight: "600" },
  emergencyChip: {
    width: 92,
    borderRadius: radius.card,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emergencyIcon: { fontSize: 22 },
  emergencyText: { color: colors.danger, fontWeight: "800", fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800", paddingHorizontal: 16, marginBottom: 10 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 8,
  },
  tileIcon: { fontSize: 30 },
  tileLabel: { color: colors.text, fontSize: 12, fontWeight: "600", textAlign: "center" },
});
