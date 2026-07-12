import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Card, Badge } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Bookings">;
type Booking = Awaited<ReturnType<typeof api.getMyBookings>>["bookings"][number];

export default function BookingsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.getMyBookings().then(({ bookings: b }) => setBookings(b));
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>No bookings yet.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{item.jobTitle}</Text>
                <Badge label={item.status.replace("_", " ")} tone="accent" />
              </View>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>Payout PKR {item.payoutPKR.toLocaleString()}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
