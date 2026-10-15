import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Linking } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Field, Badge } from "../components/ui";
import { StatusStepper, PriceText, RatingStars, ConfettiBurst, GradientButton, GlassCard, haptic } from "../components/ds";
import { DestinationMarker, TrackedBikeMarker } from "../components/MapPins";
import { Icon } from "../components/Icon";
import { DraggableSheet } from "../components/DraggableSheet";
import { sound } from "../lib/sound";
import { colors, mapStyle, mapProvider } from "../lib/theme";
import { enumLabel, STATUS_STEPS, statusStepIndex } from "../lib/status";
import { useI18n } from "../lib/i18n";
import { CancelBookingSheet } from "./CancelBookingSheet";

const CANCELLABLE_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED"];

type Props = NativeStackScreenProps<HomeStackParamList, "BookingDetail">;

const AVERAGE_SPEED_KMH = 22; // rough urban two-wheeler speed — shown as an estimate

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PAYMENT_METHODS = ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"] as const;

// Placeholder numbers until real business accounts are swapped into .env.
const PAYMENT_ACCOUNTS: Record<(typeof PAYMENT_METHODS)[number], { labelKey: "pay.jazzcashNumber" | "pay.easypaisaNumber" | "pay.accountTitle" | "pay.accountNumber" | "pay.bank"; value: string }[]> = {
  JAZZCASH: [{ labelKey: "pay.jazzcashNumber", value: process.env.EXPO_PUBLIC_JAZZCASH_NUMBER ?? "—" }],
  EASYPAISA: [{ labelKey: "pay.easypaisaNumber", value: process.env.EXPO_PUBLIC_EASYPAISA_NUMBER ?? "—" }],
  BANK_TRANSFER: [
    { labelKey: "pay.accountTitle", value: process.env.EXPO_PUBLIC_BANK_ACCOUNT_TITLE ?? "—" },
    { labelKey: "pay.accountNumber", value: process.env.EXPO_PUBLIC_BANK_ACCOUNT_NUMBER ?? "—" },
    { labelKey: "pay.bank", value: process.env.EXPO_PUBLIC_BANK_NAME ?? "—" },
  ],
};
// `code` is what the backend stores (stable English); `key` is the localized label.
const REVIEW_TAGS = [
  { code: "Professional", key: "review.professional" },
  { code: "On time", key: "review.onTime" },
  { code: "Clean work", key: "review.cleanWork" },
  { code: "Cooperative", key: "review.cooperative" },
] as const;
const TRACKED_STATUSES = ["ON_MY_WAY", "ARRIVED", "WORKING"];
const STATUS_POLL_MS = 6000;

export default function BookingDetailScreen({ route, navigation }: Props) {
  const { t, td } = useI18n();
  const insets = useSafeAreaInsets();
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
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [rebooking, setRebooking] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const load = useCallback(() => {
    api
      .getBookingDetail(bookingId)
      .then(({ booking: b }) => {
        const newStatus = b.status as string;
        const prev = prevStatusRef.current;
        if (prev && prev !== newStatus) {
          if (newStatus === "DONE" || newStatus === "COMPLETED") sound.jobDone();
          else sound.statusChanged();
          haptic.success();
        }
        prevStatusRef.current = newStatus;
        setBooking(b);
      })
      .catch(() => {});
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

  const status = booking?.status as string | undefined;
  const tracked = !!status && TRACKED_STATUSES.includes(status);

  useEffect(() => {
    if (!tracked) return;
    let cancelled = false;
    const fetchPing = async () => {
      try {
        const { ping } = await api.getLatestLocation(bookingId);
        if (!cancelled && ping) setProLocation(ping);
      } catch {
        // Next tick will retry.
      }
    };
    fetchPing();
    const interval = setInterval(fetchPing, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tracked, bookingId]);

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
      // The rating chosen on the confirm card is saved straight away. If it
      // fails, the COMPLETED screen still offers the rating form.
      if (rating > 0) await api.submitReview(bookingId, rating, tags).catch(() => {});
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

  async function rebook() {
    setRebooking(true);
    try {
      const { job } = await api.rebookJob(bookingId);
      navigation.navigate("JobDetail", { jobId: job.id });
    } finally {
      setRebooking(false);
    }
  }

  async function submitRating() {
    setBusy(true);
    try {
      await api.submitReview(bookingId, rating, tags);
      Alert.alert(t("review.thanksTitle"), t("review.thanksBody"));
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!booking || !status) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const stepIndex = statusStepIndex(status);
  const stepLabels = STATUS_STEPS.map((s) => enumLabel(td, "booking", s));
  const proName = booking.otherPartyName as string;
  const revealStage = booking.revealStage as string;
  const done = status === "DONE" || status === "COMPLETED";
  const dest = { latitude: booking.jobLat as number, longitude: booking.jobLng as number };
  const etaMin = proLocation ? Math.max(1, Math.round((distanceKm(proLocation.lat, proLocation.lng, dest.latitude, dest.longitude) / AVERAGE_SPEED_KMH) * 60)) : null;
  const openChat = () => navigation.navigate("MessageThread", { bookingId, otherPartyName: proName });

  const body = (
    <>
        <Text style={styles.title}>{booking.jobTitle as string}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, done && { color: colors.secondary }]}>PKR {(booking.totalPKR as number).toLocaleString()}</Text>
          <View style={[styles.pill, done ? { backgroundColor: "rgba(30,194,139,0.14)" } : { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.pillText, { color: done ? colors.secondary : colors.accent }]}>{enumLabel(td, "booking", status).toUpperCase()}</Text>
          </View>
        </View>

        {stepIndex >= 0 && <StatusStepper labels={stepLabels} activeIndex={stepIndex} />}

        {CANCELLABLE_STATUSES.includes(status) && (
          <Pressable onPress={() => setCancelSheetOpen(true)} style={{ marginTop: 14, alignSelf: "flex-start" }}>
            <Text style={{ color: colors.dangerSoft, fontWeight: "700", fontSize: 13 }}>{t("booking.cancel")}</Text>
          </Pressable>
        )}

        {booking.paymentMode !== "CASH_WALLET" && status === "PENDING_PAYMENT" && !booking.paymentStatus && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>{t("pay.secureTitle")}</Text>
            <View style={styles.trustCard}>
              <Text style={{ color: colors.secondary }}>🔒</Text>
              <Text style={styles.trustCardText}>{t("pay.secureBody")}</Text>
            </View>
            {Boolean(booking.estimatedPartsNote) && (
              <Text style={styles.partsNote}>{t("pay.partsNote", { note: booking.estimatedPartsNote as string })}</Text>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 }}>
              {PAYMENT_METHODS.map((m) => (
                <Pressable key={m} onPress={() => setMethod(m)} style={[styles.chip, method === m && styles.chipActive]}>
                  <Text style={{ color: method === m ? colors.accent : colors.textMuted, fontSize: 12 }}>{enumLabel(td, "method", m)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.accountCard}>
              <Text style={styles.accountCardTitle}>{t("pay.sendTo")}</Text>
              {PAYMENT_ACCOUNTS[method].map((row) => (
                <View key={row.labelKey} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t(row.labelKey)}</Text>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{row.value}</Text>
                </View>
              ))}
            </View>
            {proofUrl ? (
              <Text style={{ color: colors.secondary, marginBottom: 10 }}>{t("topup.proofUploaded")}</Text>
            ) : (
              <Pressable onPress={pickProof} style={{ marginBottom: 10 }}>
                <Text style={{ color: colors.accent, fontWeight: "700" }}>📷 {t("pay.uploadProof")}</Text>
              </Pressable>
            )}
            <Button title={t("pay.submit")} onPress={submitPayment} loading={busy} disabled={!proofUrl} />
          </Card>
        )}

        {booking.paymentMode !== "CASH_WALLET" && status === "PENDING_PAYMENT" && booking.paymentStatus === "SUBMITTED" && (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.accent }}>{t("pay.awaitingVerification")}</Text>
          </Card>
        )}

        {booking.paymentMode === "CASH_WALLET" && done && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>{t("pay.payDirectly", { name: proName || t("booking.yourPro") })}</Text>
            <PriceText pkr={(booking.totalPKR as number) - ((booking.rewardDiscountPKR as number | undefined) ?? 0)} size="md" color={colors.accent} />
            {Number(booking.rewardDiscountPKR) > 0 && (
              <Text style={{ color: colors.success, marginTop: 4, fontSize: 12, fontWeight: "700" }}>
                {t("reward.applied", { amount: booking.rewardDiscountPKR as number, total: (booking.totalPKR as number).toLocaleString() })}
              </Text>
            )}
            <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13, lineHeight: 19 }}>{t("pay.cashNote")}</Text>
          </Card>
        )}

        {revealStage === "MASKED" && (
          <View style={styles.contactCard}>
            <Text style={[styles.contactLabel, { color: colors.accent }]}>{t("booking.chatWithPro")}</Text>
            <Text style={styles.contactName}>{proName}</Text>
            <Text style={styles.contactSub}>{t("booking.unlocksOnTheWay")}</Text>
            <View style={styles.contactActions}>
              <Pressable onPress={openChat}>
                <Text style={styles.contactAction}>💬 {t("common.message")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {revealStage === "FULL" && (
          <View style={styles.contactCard}>
            <Text style={[styles.contactLabel, { color: colors.success }]}>{t("booking.contactUnlocked")}</Text>
            <Text style={styles.contactName}>
              {proName} · {booking.otherPartyPhone as string}
            </Text>
            <View style={styles.contactActions}>
              <Pressable onPress={() => Linking.openURL(`tel:${booking.otherPartyPhone}`)}>
                <Text style={styles.contactAction}>📞 {t("common.call")}</Text>
              </Pressable>
              <Pressable onPress={openChat}>
                <Text style={styles.contactAction}>💬 {t("common.message")}</Text>
              </Pressable>
            </View>
            {Boolean(booking.exactAddress) && <Text style={styles.contactSub}>{booking.exactAddress as string}</Text>}
          </View>
        )}

        {status === "DONE" && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t("done.proMarkedDone")}</Text>
            <Text style={styles.confirmSub}>{t("done.paySafe")}</Text>

            <Text style={styles.rateLabel}>{t("done.ratePro")}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <Text style={{ fontSize: 30, color: n <= rating ? colors.accent : colors.border }}>★</Text>
                </Pressable>
              ))}
            </View>

            {!showDispute ? (
              <>
                <GradientButton title={t("done.confirm")} onPress={confirmDone} disabled={busy} />
                <Pressable onPress={() => setShowDispute(true)} style={{ marginTop: 12, padding: 4 }}>
                  <Text style={{ textAlign: "center", fontSize: 13, fontWeight: "700", color: colors.dangerSoft }}>{t("done.problem")}</Text>
                </Pressable>
              </>
            ) : (
              <View style={{ marginTop: 6 }}>
                <Field label={t("done.whatWentWrong")} multiline numberOfLines={3} value={disputeReason} onChangeText={setDisputeReason} />
                <Button title={t("done.openDispute")} variant="danger" onPress={submitDispute} loading={busy} />
              </View>
            )}
          </View>
        )}

        {status === "COMPLETED" && (
          <View style={{ marginTop: 16, gap: 14 }}>
            {!!booking.totalDurationMinutes && (
              <Card>
                <Text style={styles.cardTitle}>{t("booking.summary")}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t("booking.totalTime")}</Text>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                    {t("time.minutesShort", { n: booking.totalDurationMinutes as number })}
                  </Text>
                </View>
                {!!booking.workDurationMinutes && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t("booking.workTime")}</Text>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                      {t("time.minutesShort", { n: booking.workDurationMinutes as number })}
                    </Text>
                  </View>
                )}
              </Card>
            )}

            <Button
              title={rebooking ? t("booking.booking") : t("booking.bookAgain", { name: proName || t("booking.yourPro") })}
              variant="ghost"
              onPress={rebook}
              loading={rebooking}
            />

            {!booking.hasReview ? (
              <Card>
                <Text style={styles.cardTitle}>{t("done.ratePro")}</Text>
                <View style={[styles.starsRow, { marginVertical: 10, justifyContent: "flex-start" }]}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRating(n)}>
                      <Text style={{ fontSize: 28, color: n <= rating ? colors.accent : colors.border }}>★</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {REVIEW_TAGS.map(({ code, key }) => (
                    <Pressable
                      key={code}
                      onPress={() => setTags((cur) => (cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code]))}
                      style={[styles.chip, tags.includes(code) && styles.chipActive]}
                    >
                      <Text style={{ color: tags.includes(code) ? colors.accent : colors.textMuted, fontSize: 12 }}>{t(key)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Button title={t("review.submit")} onPress={submitRating} loading={busy} />
              </Card>
            ) : (
              <Card style={{ alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, marginBottom: 6 }}>{t("review.youRated")}</Text>
                <RatingStars rating={rating} size={22} />
              </Card>
            )}
          </View>
        )}

        {!["PENDING_PAYMENT", "CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "COMPLETED"].includes(status) && (
          <View style={{ marginTop: 16 }}>
            <Badge label={enumLabel(td, "booking", status)} tone="muted" />
          </View>
        )}
    </>
  );

  // Live tracking (pro on the way / arrived / working): a full-screen map with a draggable bottom sheet that
  // holds everything else. Drag it down for an almost full-screen map, up for the details.
  if (tracked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={mapProvider}
          customMapStyle={mapStyle}
          initialRegion={{ ...dest, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
          toolbarEnabled={false}
          showsCompass={false}
          pitchEnabled={false}
        >
          <DestinationMarker coordinate={dest} />
          {proLocation && (
            <>
              <Polyline
                coordinates={[{ latitude: proLocation.lat, longitude: proLocation.lng }, dest]}
                strokeColor={colors.accent}
                strokeWidth={3}
                lineDashPattern={[2, 8]}
                lineCap="round"
              />
              <TrackedBikeMarker location={proLocation} />
            </>
          )}
        </MapView>

        <View style={[styles.trackTop, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
          <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
            <Icon name="back" size={16} />
          </Pressable>
          <GlassCard style={styles.trackPill}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
              {etaMin != null ? t("track.minutesAway", { name: proName, n: etaMin }) : t("track.onTheWay", { name: proName })}
            </Text>
          </GlassCard>
        </View>

        <DraggableSheet
          initialSnap="half"
          peek={
            <View style={{ paddingBottom: 8 }}>
              <Text style={styles.title} numberOfLines={1}>
                {etaMin != null ? t("track.minutesAway", { name: proName, n: etaMin }) : t("track.onTheWay", { name: proName })}
              </Text>
            </View>
          }
        >
          {body}
        </DraggableSheet>
        <ConfettiBurst trigger={confettiTrigger} />
        <CancelBookingSheet visible={cancelSheetOpen} bookingId={bookingId} onClose={() => setCancelSheetOpen(false)} onCancelled={load} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.headerLabel}>{done ? t("booking.jobDoneHeader") : t("booking.liveTracking")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 32 }}>
        {body}
      </ScrollView>
      <ConfettiBurst trigger={confettiTrigger} />
      <CancelBookingSheet visible={cancelSheetOpen} bookingId={bookingId} onClose={() => setCancelSheetOpen(false)} onCancelled={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  headerLabel: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 4, marginBottom: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  price: { fontSize: 17, fontWeight: "800", color: colors.accent },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  pillText: { fontSize: 10, fontWeight: "700" },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  chip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  accountCard: { backgroundColor: colors.bgElevated2, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, marginBottom: 12 },
  accountCardTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  trustCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(30,194,139,0.1)",
    borderWidth: 1,
    borderColor: "rgba(30,194,139,0.3)",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  trustCardText: { color: colors.secondary, fontWeight: "700", fontSize: 13, flex: 1 },
  partsNote: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  contactCard: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 16, padding: 15, marginTop: 16 },
  contactLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  contactName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  contactSub: { color: colors.textMuted, fontSize: 12, marginTop: 9 },
  contactActions: { flexDirection: "row", gap: 18, marginTop: 9 },
  contactAction: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  trackTop: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  trackPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  mapCard: { height: 260, borderRadius: 18, overflow: "hidden", marginTop: 16, backgroundColor: "#0E0C0A" },
  mapPill: { position: "absolute", bottom: 10, left: 12, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  confirmCard: { marginTop: 16, backgroundColor: "rgba(245,166,35,0.07)", borderWidth: 1, borderColor: "rgba(245,166,35,0.25)", borderRadius: 16, padding: 18 },
  confirmTitle: { color: colors.text, fontSize: 15, fontWeight: "800", marginBottom: 4 },
  confirmSub: { color: colors.textSecondary, fontSize: 12, marginBottom: 14 },
  rateLabel: { color: colors.textMuted, fontSize: 11, textAlign: "center", marginBottom: 8 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 4, marginBottom: 16 },
});
