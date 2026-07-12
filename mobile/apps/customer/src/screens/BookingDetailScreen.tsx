import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Field } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "BookingDetail">;

const PAYMENT_METHODS = ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"] as const;
const REVIEW_TAGS = ["Professional", "On time", "Clean work", "Cooperative"];
const TRACKED_STATUSES = ["ON_MY_WAY", "ARRIVED", "WORKING"];

export default function BookingDetailScreen({ route }: Props) {
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api.getBookingDetail(bookingId).then(({ booking: b }) => setBooking(b));
  }, [bookingId]);

  useFocusEffect(load);

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{booking.jobTitle as string}</Text>
      <Text style={styles.subtitle}>PKR {(booking.totalPKR as number).toLocaleString()} · {status.replace("_", " ")}</Text>

      {status === "PENDING_PAYMENT" && !booking.paymentStatus && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.cardTitle}>Pay into escrow</Text>
          <View style={{ flexDirection: "row", gap: 8, marginVertical: 10 }}>
            {PAYMENT_METHODS.map((m) => (
              <Pressable key={m} onPress={() => setMethod(m)} style={[styles.chip, method === m && styles.chipActive]}>
                <Text style={{ color: method === m ? colors.accent : colors.textMuted, fontSize: 12 }}>{m}</Text>
              </Pressable>
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
          {Boolean(booking.exactAddress) && <Text style={{ color: colors.textMuted }}>{booking.exactAddress as string}</Text>}
        </Card>
      )}

      {TRACKED_STATUSES.includes(status) && (
        <MapView
          style={{ height: 220, borderRadius: 14, marginTop: 16 }}
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
                <Button title="There's a problem" variant="danger" onPress={() => setShowDispute(true)} />
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

      {status === "COMPLETED" && !booking.hasReview && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.cardTitle}>Rate your pro</Text>
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
                style={[styles.chip, tags.includes(t) && styles.chipActive]}
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

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: colors.accent, backgroundColor: "rgba(255,176,32,0.1)" },
});
