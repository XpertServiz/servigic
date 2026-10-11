import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MessagesStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card } from "../components/ui";
import { EmptyState, ProviderAvatar } from "../components/ds";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<MessagesStackParamList, "Messages">;

interface Thread {
  bookingId: string;
  jobTitle: string;
  otherPartyName: string;
}

export default function MessagesScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
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
                // Chat opens as soon as the booking is MASKED (contact still hidden).
                open: (booking.revealStage as string) !== "LOCKED",
              }))
              .catch(() => null)
          )
        );
        setThreads(details.filter((d): d is Thread & { open: boolean } => d !== null && d.open));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Text style={[styles.title, { paddingTop: insets.top + 16 }]}>{t("messages.title")}</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(th) => th.bookingId}
          contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="🔒" title={t("messages.emptyTitle")} subtitle={t("messages.emptySub")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("MessageThread", { bookingId: item.bookingId, otherPartyName: item.otherPartyName })}>
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ProviderAvatar name={item.otherPartyName} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{item.otherPartyName}</Text>
                  <Text style={{ color: colors.textMuted, marginTop: 3, fontSize: 12 }} numberOfLines={1}>
                    {item.jobTitle}
                  </Text>
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
  title: { color: colors.text, fontSize: 23, fontWeight: "800", paddingHorizontal: 18, paddingBottom: 12 },
});
