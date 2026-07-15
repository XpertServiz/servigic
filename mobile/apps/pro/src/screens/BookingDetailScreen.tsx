import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card } from "../components/ui";
import { StatusPillTimeline, PriceText, haptic } from "../components/ds";
import { sound } from "../lib/sound";
import { colors, mapStyle, radius } from "../lib/theme";

type Props = NativeStackScreenProps<JobsStackParamList, "BookingDetail">;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

const NEXT_ACTION: Record<string, { next: "ON_MY_WAY" | "ARRIVED" | "WORKING" | "DONE"; label: string } | undefined> = {
  CONFIRMED: { next: "ON_MY_WAY", label: "START DRIVING →" },
  ON_MY_WAY: { next: "ARRIVED", label: "I'VE ARRIVED" },
  ARRIVED: { next: "WORKING", label: "START WORK" },
  WORKING: { next: "DONE", label: "JOB DONE ✓" },
};

const TIMELINE_STEPS = ["Confirmed", "On the way", "Arrived", "Working", "Done"];
const TIMELINE_STATUS_ORDER = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];
const REVIEW_TAGS = ["Professional", "On time", "Clean work", "Good communication"];
const PING_INTERVAL_MS = 45000;
const STATUS_POLL_MS = 6000;

export default function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const prevStatusRef = useRef<string | null>(null);

  const load = useCallback(() => {
    api.getBookingDetail(bookingId).then(({ booking: b }) => {
      const newStatus = b.status as string;
      if (prevStatusRef.current && prevStatusRef.current !== newStatus) {
        sound.statusChanged();
        haptic.success();
      }
      prevStatusRef.current = newStatus;
      setBooking(b);
    });
  }, [bookingId]);

  // Polls while focused so a customer confirming the job, or an admin
  // verifying payment, shows up here immediately without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, STATUS_POLL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  const status = booking?.status as string | undefined;

  useEffect(() => {
    if (status !== "ON_MY_WAY") return;

    let cancelled = false;
    async function sendPing() {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted" || cancelled) return;
      const pos = await Location.getCurrentPositionAsync({});
      if (cancelled) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setMyLocation({ lat, lng });
      await api.sendLocationPing(bookingId, lat, lng);
    }

    sendPing();
    const interval = setInterval(sendPing, PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, bookingId]);

  async function advanceStatus() {
    if (!status) return;
    const action = NEXT_ACTION[status];
    if (!action) return;
    setBusy(true);
    try {
      await api.updateBookingStatus(bookingId, action.next);
      haptic.success();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function submitRating() {
    setBusy(true);
    try {
      await api.submitReview(bookingId, rating, tags);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!booking) return null;
  const action = status ? NEXT_ACTION[status] : undefined;
  const tracked = ["ON_MY_WAY", "ARRIVED", "WORKING"].includes(status ?? "");
  const timelineIndex = status ? TIMELINE_STATUS_ORDER.indexOf(status) : -1;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{booking.jobTitle as string}</Text>
      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <PriceText pkr={booking.payoutPKR as number} size="md" color={colors.secondary} />
        <Text style={{ color: colors.textMuted, fontWeight: "600" }}>{(status ?? "").replace("_", " ")}</Text>
      </View>

      {timelineIndex >= 0 && (
        <Card style={{ marginTop: 16, paddingVertical: 20 }}>
          <StatusPillTimeline steps={TIMELINE_STEPS} activeIndex={timelineIndex} />
        </Card>
      )}

      {Boolean(booking.unlocked) && (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.secondary, fontWeight: "700" }}>Contact unlocked</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>
            {booking.otherPartyName as string} · {booking.otherPartyPhone as string}
          </Text>
          <View style={{ flexDirection: "row", gap: 20, marginTop: 10 }}>
            <Pressable onPress={() => Linking.openURL(`tel:${booking.otherPartyPhone}`)}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>📞 Call</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate("MessageThread", { bookingId, otherPartyName: booking.otherPartyName as string })
              }
            >
              <Text style={{ color: colors.accent, fontWeight: "700" }}>💬 Message</Text>
            </Pressable>
          </View>
          {Boolean(booking.exactAddress) && status !== "COMPLETED" && (
            <Pressable
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${booking.jobLat},${booking.jobLng}`)
              }
            >
              <Text style={{ color: colors.accent, fontWeight: "700", marginTop: 8 }}>Navigate →</Text>
            </Pressable>
          )}
        </Card>
      )}

      {tracked && (
        <MapView
          style={{ height: 220, borderRadius: radius.card, marginTop: 16 }}
          customMapStyle={mapStyle}
          initialRegion={{
            latitude: booking.jobLat as number,
            longitude: booking.jobLng as number,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={{ latitude: booking.jobLat as number, longitude: booking.jobLng as number }} pinColor={colors.secondary} />
          {myLocation && <Marker coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }} pinColor={colors.accent} />}
        </MapView>
      )}

      {action && (
        <View style={{ marginTop: 20 }}>
          <Button title={action.label} onPress={advanceStatus} loading={busy} />
        </View>
      )}

      {status === "DONE" && (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.textMuted }}>Waiting for the customer to confirm the job is done.</Text>
        </Card>
      )}

      {status === "COMPLETED" && Boolean(booking.totalDurationMinutes) && (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Job summary</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total time</Text>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
              {formatDuration(booking.totalDurationMinutes as number)}
            </Text>
          </View>
          {Boolean(booking.workDurationMinutes) && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Work time</Text>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                {formatDuration(booking.workDurationMinutes as number)}
              </Text>
            </View>
          )}
        </Card>
      )}

      {status === "COMPLETED" && !booking.hasReview && (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Rate this customer</Text>
          <View style={{ flexDirection: "row", gap: 4, marginVertical: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Text style={{ fontSize: 28, color: n <= rating ? colors.accent : colors.border }}>★</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {REVIEW_TAGS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                style={{
                  borderWidth: 1,
                  borderColor: tags.includes(t) ? colors.accent : colors.border,
                  backgroundColor: tags.includes(t) ? "rgba(255,176,32,0.1)" : "transparent",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: tags.includes(t) ? colors.accent : colors.textMuted, fontSize: 12 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Button title="Submit Rating" onPress={submitRating} loading={busy} />
        </Card>
      )}
    </ScrollView>
  );
}
