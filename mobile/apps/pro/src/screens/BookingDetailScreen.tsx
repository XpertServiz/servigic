import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Badge } from "../components/ui";
import { StatusStepper, PriceText, haptic } from "../components/ds";
import { sound } from "../lib/sound";
import { colors } from "../lib/theme";
import { enumLabel, STATUS_STEPS, statusStepIndex } from "../lib/status";
import { useI18n } from "../lib/i18n";
import { CancelBookingSheet } from "./CancelBookingSheet";
import { OnTheWayView } from "./booking/OnTheWayView";
import { JobActiveView } from "./booking/JobActiveView";
import { JobDoneView } from "./booking/JobDoneView";
import type { BookingActions, BookingData } from "./booking/types";

const CANCELLABLE_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED"];
const MAP_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED"];

type Props = NativeStackScreenProps<JobsStackParamList, "BookingDetail">;

function formatDuration(minutes: number, t: ReturnType<typeof useI18n>["t"]): string {
  if (minutes < 60) return t("time.minutesShort", { n: minutes });
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? t("time.hoursShort", { n: hrs }) : `${t("time.hoursShort", { n: hrs })} ${t("time.minutesShort", { n: mins })}`;
}

const NEXT_ACTION: Record<string, { next: "ON_MY_WAY" | "ARRIVED" | "WORKING" | "DONE"; labelKey: "booking.startDriving" | "booking.imArrived" | "booking.startWork" | "booking.jobDone" } | undefined> = {
  CONFIRMED: { next: "ON_MY_WAY", labelKey: "booking.startDriving" },
  ON_MY_WAY: { next: "ARRIVED", labelKey: "booking.imArrived" },
  ARRIVED: { next: "WORKING", labelKey: "booking.startWork" },
  WORKING: { next: "DONE", labelKey: "booking.jobDone" },
};

// `code` is what the backend stores (stable English); `key` is the localized label.
const REVIEW_TAGS = [
  { code: "Professional", key: "review.professional" },
  { code: "On time", key: "review.onTime" },
  { code: "Clean work", key: "review.cleanWork" },
  { code: "Good communication", key: "review.goodCommunication" },
] as const;
const PING_INTERVAL_MS = 45000;
const STATUS_POLL_MS = 6000;

export default function BookingDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t, td } = useI18n();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [busy, setBusy] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const load = useCallback(() => {
    api
      .getBookingDetail(bookingId)
      .then(({ booking: raw }) => {
        const b = raw as unknown as BookingData;
        const prev = prevStatusRef.current;
        if (prev && prev !== b.status) {
          if (b.status === "DONE") sound.jobDone();
          else if (b.status === "COMPLETED") (b.paymentMode === "PROTECTED" ? sound.paymentAdded : sound.jobDone)();
          else if (b.status === "CANCELLED") sound.jobCancelled();
          else sound.statusChanged();
          haptic.success();
        }
        prevStatusRef.current = b.status;
        setBooking(b);
      })
      .catch(() => {});
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

  const status = booking?.status;
  const fullBleed = !!status && (MAP_STATUSES.includes(status) || status === "WORKING" || status === "DONE");

  // The map / job-in-progress / job-done layouts draw their own top controls.
  useEffect(() => {
    navigation.setOptions({ headerShown: !fullBleed });
  }, [fullBleed, navigation]);

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

    sendPing().catch(() => {});
    const interval = setInterval(() => sendPing().catch(() => {}), PING_INTERVAL_MS);
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

  if (!booking) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const action = status ? NEXT_ACTION[status] : undefined;
  const actions: BookingActions = {
    advance: advanceStatus,
    busy,
    openMessages: () => navigation.navigate("MessageThread", { bookingId, otherPartyName: booking.otherPartyName }),
    openCancel: () => setCancelSheetOpen(true),
  };
  const canCancel = !!status && CANCELLABLE_STATUSES.includes(status);

  let body: React.ReactNode;
  if (status && MAP_STATUSES.includes(status) && action) {
    body = <OnTheWayView booking={booking} actions={actions} myLocation={myLocation} ctaLabel={t(action.labelKey)} canCancel={canCancel} />;
  } else if (status === "WORKING") {
    body = <JobActiveView booking={booking} actions={actions} />;
  } else if (status === "DONE") {
    body = <JobDoneView booking={booking} onBackToJobs={() => navigation.popToTop()} />;
  } else {
    body = (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 + insets.bottom }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{booking.jobTitle}</Text>
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <PriceText pkr={booking.payoutPKR} size="md" color={colors.secondary} />
          <Badge label={enumLabel(td, "booking", status)} tone={status === "COMPLETED" ? "secondary" : "muted"} />
        </View>

        {statusStepIndex(status) >= 0 && (
          <View style={{ marginTop: 16 }}>
            <StatusStepper labels={STATUS_STEPS.map((s) => enumLabel(td, "booking", s))} activeIndex={statusStepIndex(status)} />
          </View>
        )}

        {booking.revealStage !== "LOCKED" && (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: booking.revealStage === "FULL" ? colors.secondary : colors.accent, fontWeight: "700" }}>
              {booking.revealStage === "FULL" ? t("booking.contactUnlocked") : t("booking.chatWithCustomer")}
            </Text>
            {booking.revealStage === "FULL" ? (
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                {booking.otherPartyName} · {booking.otherPartyPhone}
              </Text>
            ) : (
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>{t("booking.unlocksOnTheWay")}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 20, marginTop: 10 }}>
              {booking.revealStage === "FULL" && !!booking.otherPartyPhone && (
                <Pressable onPress={() => Linking.openURL(`tel:${booking.otherPartyPhone}`)}>
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>📞 {t("common.call")}</Text>
                </Pressable>
              )}
              <Pressable onPress={actions.openMessages}>
                <Text style={{ color: colors.accent, fontWeight: "700" }}>💬 {t("common.message")}</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {status === "COMPLETED" && !!booking.totalDurationMinutes && (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{t("booking.summary")}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t("booking.totalTime")}</Text>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{formatDuration(booking.totalDurationMinutes, t)}</Text>
            </View>
            {!!booking.workDurationMinutes && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t("booking.workTime")}</Text>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{formatDuration(booking.workDurationMinutes, t)}</Text>
              </View>
            )}
          </Card>
        )}

        {status === "COMPLETED" && !booking.hasReview && (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{t("review.rateCustomer")}</Text>
            <View style={{ flexDirection: "row", gap: 4, marginVertical: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Text style={{ fontSize: 28, color: n <= rating ? colors.accent : colors.border }}>★</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {REVIEW_TAGS.map(({ code, key }) => {
                const label = t(key);
                const selected = tags.includes(code);
                return (
                  <Pressable
                    key={code}
                    onPress={() => setTags((cur) => (cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code]))}
                    style={{
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentTint : "transparent",
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: 12 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button title={t("review.submit")} onPress={submitRating} loading={busy} />
          </Card>
        )}
      </ScrollView>
    );
  }

  return (
    <>
      {body}
      <CancelBookingSheet visible={cancelSheetOpen} bookingId={bookingId} arrived={status === "ARRIVED"} onClose={() => setCancelSheetOpen(false)} onCancelled={load} />
    </>
  );
}
