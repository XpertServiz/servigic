import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Field } from "../components/ui";
import { PriceText, Chip, haptic } from "../components/ds";
import { sound } from "../lib/sound";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<JobsStackParamList, "JobDetail">;

const ETA_CHIPS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hrs", minutes: 120 },
];
const PRICE_STEP = 100;

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [myBid, setMyBid] = useState<Record<string, unknown> | null>(null);
  const [verificationLevel, setVerificationLevel] = useState(0);
  const [price, setPrice] = useState(1500);
  const [eta, setEta] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [winHint, setWinHint] = useState<{ winProbability: number; isHeuristic: boolean } | null>(null);

  const load = useCallback(() => {
    api.getProviderJobDetail(jobId).then((data) => {
      // Once the customer accepts this bid, there's nothing left to do on
      // the job screen — the booking (contact, map, chat, status buttons)
      // is the real destination, so jump straight there instead of
      // stranding the pro on a dead "Bid status: ACCEPTED" card.
      if (data.bookingId) {
        navigation.replace("BookingDetail", { bookingId: data.bookingId });
        return;
      }
      setJob(data.job);
      setMyBid(data.myBid);
      setVerificationLevel(data.verificationLevel);
      if (data.myBid) {
        setPrice((data.myBid as { pricePKR: number }).pricePKR);
        setEta(String((data.myBid as { etaMinutes: number }).etaMinutes));
      }
    });
  }, [jobId, navigation]);

  useFocusEffect(load);

  useEffect(() => {
    if (!price || !eta || price <= 0 || Number(eta) <= 0) {
      setWinHint(null);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .getBidWinProbability(jobId, price, Number(eta))
        .then(setWinHint)
        .catch(() => setWinHint(null));
    }, 500);
    return () => clearTimeout(timeout);
  }, [jobId, price, eta]);

  async function submitBid() {
    const isFirstSubmit = !myBid;
    setBusy(true);
    try {
      await api.submitBid({ jobId, pricePKR: price, etaMinutes: Number(eta), message: message || undefined });
      haptic.success();
      sound.bidSent();
      if (isFirstSubmit) {
        // A brand-new bid has nothing left to do on this screen until the
        // customer responds — sitting here with no next step reads as
        // "stuck." Head back to the Jobs list where it'll show under
        // Available with the green "Bid sent ✓" badge.
        Alert.alert("Bid sent!", "Waiting for the customer to respond.");
        navigation.goBack();
        return;
      }
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit bid");
    } finally {
      setBusy(false);
    }
  }

  async function respondToCounter(action: "accept" | "decline") {
    if (!myBid) return;
    setBusy(true);
    try {
      await api.respondToCounter((myBid as { id: string }).id, action);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!job) return null;

  const bidStatus = myBid ? (myBid as { status: string }).status : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{job.title as string}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 6 }}>{job.description as string}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 13 }}>
        {job.customerFirstName as string} · {job.distanceBand as string} · {job.areaLabel as string}
      </Text>

      {verificationLevel < 1 ? (
        <Card style={{ marginTop: 20, borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>Complete verification before you can bid.</Text>
        </Card>
      ) : bidStatus === "COUNTERED" ? (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>Customer countered with</Text>
          <PriceText pkr={(myBid as { counterPricePKR: number }).counterPricePKR ?? 0} size="lg" color={colors.accent} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Button title="Accept" onPress={() => respondToCounter("accept")} loading={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Decline" variant="ghost" onPress={() => respondToCounter("decline")} loading={busy} />
            </View>
          </View>
        </Card>
      ) : bidStatus && bidStatus !== "PENDING" ? (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.textMuted }}>
            Bid status: <Text style={{ color: colors.text, fontWeight: "700" }}>{bidStatus}</Text>
          </Text>
        </Card>
      ) : (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 14 }}>{myBid ? "Edit your bid" : "Submit a bid"}</Text>

          <Text style={styles.label}>Price</Text>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => setPrice((p) => Math.max(PRICE_STEP, p - PRICE_STEP))}
              style={styles.stepperBtn}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <PriceText pkr={price} size="lg" />
            </View>
            <Pressable onPress={() => setPrice((p) => p + PRICE_STEP)} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>ETA</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            {ETA_CHIPS.map((c) => (
              <Chip key={c.minutes} label={c.label} active={eta === String(c.minutes)} onPress={() => setEta(String(c.minutes))} />
            ))}
          </View>
          <View style={{ marginTop: 8 }}>
            <Field label="Custom ETA (minutes)" keyboardType="number-pad" value={eta} onChangeText={setEta} />
          </View>

          {winHint && (
            <Text style={{ color: colors.accent, fontWeight: "700", marginBottom: 10 }}>
              💡 Price to win: ~{Math.round(winHint.winProbability * 100)}% {winHint.isHeuristic ? "(estimate)" : ""}
            </Text>
          )}
          <Field label="Message (optional)" multiline numberOfLines={3} value={message} onChangeText={setMessage} />
          <Button title={myBid ? "Update Bid" : "Send Bid"} onPress={submitBid} loading={busy} disabled={!price || !eta} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgElevated2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: { color: colors.accent, fontSize: 22, fontWeight: "800" },
});
