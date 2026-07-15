import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Field } from "../components/ui";
import { StatusPillTimeline, PriceText, RatingStars, ConfettiBurst, haptic } from "../components/ds";
import { sound } from "../lib/sound";
import { colors, mapStyle, radius } from "../lib/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "BookingDetail">;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

const PAYMENT_METHODS = ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"] as const;

// Placeholder numbers until real business accounts are swapped into .env.
const PAYMENT_ACCOUNTS: Record<(typeof PAYMENT_METHODS)[number], { label: string; value: string }[]> = {
  JAZZCASH: [{ label: "JazzCash number", value: process.env.EXPO_PUBLIC_JAZZCASH_NUMBER ?? "Not configured yet" }],
  EASYPAISA: [{ label: "EasyPaisa number", value: process.env.EXPO_PUBLIC_EASYPAISA_NUMBER ?? "Not configured yet" }],
  BANK_TRANSFER: [
    { label: "Account title", value: process.env.EXPO_PUBLIC_BANK_ACCOUNT_TITLE ?? "Not configured yet" },
    { label: "Account number", value: process.env.EXPO_PUBLIC_BANK_ACCOUNT_NUMBER ?? "Not configured yet" },
    { label: "Bank", value: process.env.EXPO_PUBLIC_BANK_NAME ?? "Not configured yet" },
  ],
};
const REVIEW_TAGS = ["Professional", "On time", "Clean work", "Cooperative"];
const TRACKED_STATUSES = ["ON_MY_WAY", "ARRIVED", "WORKING"];
const TIMELINE_STEPS = ["Confirmed", "On the way", "Arrived", "Working", "Done"];
const TIMELINE_STATUS_ORDER = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"];
const STATUS_POLL_MS = 6000;

export default function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("EASYPAISA");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [proLocation, setProLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Polls while this screen is focused so status/payment changes made by
  // the pro or admin show up immediately, without the user having to back
  // out and reopen the booking to force a refresh.
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, STATUS_POLL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  useEffect(() => {
    if (!booking || !TRACKED_STATUSES.includes(booking.status as string)) return;
    pollRef.current = setInterval(async () => {
      const { ping } = await api.getLatestLocation(bookingId);
      if (ping) setProLocation(ping);
    }, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [booking, bookingId]);

  async function pickProof() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const url = await api.uploadFile(asset.uri, asset.fileName ?? "proof.jpg", asset.mimeType ?? "image/jpeg");
    setProofUrl(url);
  }

  async function submitPayment() {
    if (!proofUrl) return;
    setBusy(true);
    try {
      await api.submitPayment(bookingId, method, proofUrl);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDone() {
    setBusy(true);
    try {
      await api.confirmBooking(bookingId);
      haptic.success();
      setConfettiTrigger((n) => n + 1);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function submitDispute() {
    if (!disputeReason.trim()) return;
    setBusy(true);
    try {
      await api.openDispute(bookingId, disputeReason);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function submitRating() {
    setBusy(true);
    try {
      await api.submitReview(bookingId, rating, tags);
      Alert.alert("Thanks!", "Your rating was submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (!booking) return null;
  const status = booking.status as string;
  const timelineIndex = TIMELINE_STATUS_ORDER.indexOf(status);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{booking.jobTitle as string}</Text>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <PriceText pkr={booking.totalPKR as number} size="md" color={colors.secondary} />
          <Text style={styles.subtitle}>{status.replace("_", " ")}</Text>
        </View>

        {timelineIndex >= 0 && (
          <Card style={{ marginTop: 16, paddingVertical: 20 }}>
            <StatusPillTimeline steps={TIMELINE_STEPS} activeIndex={timelineIndex} />
          </Card>
        )}

        {status === "PENDING_PAYMENT" && !booking.paymentStatus && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>Secure Payment</Text>
            <View style={styles.trustCard}>
              <Text style={{ color: colors.secondary }}>🔒</Text>
              <Text style={styles.trustCardText}>
                Your payment is held safely and only released to the provider once you confirm the job is done.
              </Text>
            </View>
            {Boolean(booking.estimatedPartsNote) && (
              <Text style={styles.partsNote}>
                Estimated parts/materials: {booking.estimatedPartsNote as string} — this is not collected by
                Servigic. Please arrange payment for parts directly with your pro.
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginVertical: 10 }}>
              {PAYMENT_METHODS.map((m) => (
                <Pressable key={m} onPress={() => setMethod(m)} style={[styles.chip, method === m && styles.chipActive]}>
                  <Text style={{ color: method === m ? colors.accent : colors.textMuted, fontSize: 12 }}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.accountCard}>
              <Text style={styles.accountCardTitle}>Send payment to</Text>
              {PAYMENT_ACCOUNTS[method].map((row) => (
                <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{row.label}</Text>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{row.value}</Text>
                </View>
              ))}
            </View>
            {proofUrl ? (
              <Text style={{ color: colors.secondary, marginBottom: 10 }}>Proof uploaded ✓</Text>
            ) : (
              <Pressable onPress={pickProof} style={{ marginBottom: 10 }}>
                <Text style={{ color: colors.accent, fontWeight: "700" }}>📷 Upload payment proof</Text>
              </Pressable>
            )}
            <Button title="Submit Payment" onPress={submitPayment} loading={busy} disabled={!proofUrl} />
          </Card>
        )}

        {status === "PENDING_PAYMENT" && booking.paymentStatus === "SUBMITTED" && (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.accent }}>Payment submitted — awaiting admin verification.</Text>
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
            {Boolean(booking.exactAddress) && <Text style={{ color: colors.textMuted, marginTop: 8 }}>{booking.exactAddress as string}</Text>}
          </Card>
        )}

        {TRACKED_STATUSES.includes(status) && (
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
            {proLocation && <Marker coordinate={{ latitude: proLocation.lat, longitude: proLocation.lng }} pinColor={colors.accent} />}
          </MapView>
        )}

        {status === "DONE" && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>Your pro marked the job done</Text>
            {!showDispute ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Confirm Done" onPress={confirmDone} loading={busy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="There's a problem" variant="ghost" onPress={() => setShowDispute(true)} />
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                <Field label="What went wrong?" multiline numberOfLines={3} value={disputeReason} onChangeText={setDisputeReason} />
                <Button title="Open Dispute" variant="danger" onPress={submitDispute} loading={busy} />
              </View>
            )}
          </Card>
        )}

        {status === "COMPLETED" && Boolean(booking.totalDurationMinutes) && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>Job summary</Text>
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
            <Text style={styles.cardTitle}>Rate your pro</Text>
            <View style={{ marginVertical: 10 }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setRating(n)}>
                    <Text style={{ fontSize: 28, color: n <= rating ? colors.accent : colors.border }}>★</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {REVIEW_TAGS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                  style={[styles.chip, tags.includes(t) && styles.chipActive]}
                >
                  <Text style={{ color: tags.includes(t) ? colors.accent : colors.textMuted, fontSize: 12 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Button title="Submit Rating" onPress={submitRating} loading={busy} />
          </Card>
        )}

        {status === "COMPLETED" && Boolean(booking.hasReview) && (
          <Card style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, marginBottom: 6 }}>You rated this job</Text>
            <RatingStars rating={rating} size={22} />
          </Card>
        )}
      </ScrollView>
      <ConfettiBurst trigger={confettiTrigger} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontWeight: "600" },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: colors.accent, backgroundColor: "rgba(255,176,32,0.1)" },
  accountCard: { backgroundColor: colors.bgElevated2, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  accountCardTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  trustCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  trustCardText: { color: colors.secondary, fontWeight: "700", fontSize: 13, flex: 1 },
  partsNote: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
});
