import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MessagesStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card } from "../components/ui";
import { EmptyState } from "../components/ds";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<MessagesStackParamList, "Messages">;

interface Thread {
  bookingId: string;
  jobTitle: string;
  otherPartyName: string;
  unlocked: boolean;
}

export default function MessagesScreen({ navigation }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getMyBookings()
      .then(async ({ bookings }) => {
        const eligible = bookings.filter((b) => b.status !== "PENDING_PAYMENT");
        const details = await Promise.all(
          eligible.map((b) =>
            api
              .getBookingDetail(b.id)
              .then(({ booking }) => ({
                bookingId: b.id,
                jobTitle: b.jobTitle,
                otherPartyName: (booking.otherPartyName as string) ?? "Pro",
                unlocked: Boolean(booking.unlocked),
              }))
              .catch(() => null)
          )
        );
        setThreads(details.filter((t): t is Thread => t !== null && t.unlocked));
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Text style={styles.title}>Messages</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.bookingId}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
          ListEmptyComponent={
            <EmptyState icon="🔒" title="Chat unlocks after payment" subtitle="Message your pro once a job is booked and paid." />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate("MessageThread", { bookingId: item.bookingId, otherPartyName: item.otherPartyName })}
            >
              <Card>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{item.otherPartyName}</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }} numberOfLines={1}>
                  {item.jobTitle}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "800", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
});
