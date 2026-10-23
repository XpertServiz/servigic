import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Field } from "../components/ui";
import { PriceText, Chip, haptic } from "../components/ds";
import { sound } from "../lib/sound";
import { colors } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";
import { windowText } from "../lib/scheduleSlots";

type Props = NativeStackScreenProps<JobsStackParamList, "JobDetail">;

const ETA_MINUTES = [30, 60, 120];

// Step of the price buttons: about 5% of the customer's offer (or the suggested price), in a round number.
function stepFor(base: number) {
  const raw = base * 0.05;
  return raw < 10 ? 5 : raw < 100 ? Math.round(raw / 5) * 5 : Math.round(raw / 50) * 50;
}

export default function JobDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t, td, lang } = useI18n();
  const { jobId } = route.params;
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [myBid, setMyBid] = useState<Record<string, unknown> | null>(null);
  const [verificationLevel, setVerificationLevel] = useState(0);
  const [price, setPrice] = useState(1500);
  const [eta, setEta] = useState("");
  const [message, setMessage] = useState("");
  const [partsNote, setPartsNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [winHint, setWinHint] = useState<{ winProbability: number; isHeuristic: boolean } | null>(null);
  const [online, setOnlineState] = useState(true);
  const [goingOnline, setGoingOnline] = useState(false);

  const load = useCallback(() => {
    // Opened from an alert while offline? Offer a one-tap "Go online and bid".
    api
      .getMe()
      .then(({ user }) => setOnlineState((user.providerProfile as { isOnline?: boolean } | null)?.isOnline !== false))
      .catch(() => {});
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
      if (!data.myBid) {
        // Start from what the customer offers (inDrive style), else from the usual price for this service.
        const offered = Number(data.job.budgetPKR) || 0;
        const guided = (data.job.guide as { suggested?: number } | null)?.suggested ?? 0;
        if (offered > 0 || guided > 0) setPrice(offered > 0 ? offered : guided);
      }
      if (data.myBid) {
        setPrice((data.myBid as { pricePKR: number }).pricePKR);
        setEta(String((data.myBid as { etaMinutes: number }).etaMinutes));
        setPartsNote((data.myBid as { estimatedPartsNote?: string | null }).estimatedPartsNote ?? "");
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
      await api.submitBid({
        jobId,
        pricePKR: price,
        etaMinutes: Number(eta),
        message: message || undefined,
        estimatedPartsNote: partsNote || undefined,
      });
      haptic.success();
      sound.bidSent();
      if (isFirstSubmit) {
        // A brand-new bid has nothing left to do on this screen until the
        // customer responds — sitting here with no next step reads as
        // "stuck." Head back to the Jobs list where it'll show under
        // Available with the "Bid sent" pill.
        Alert.alert(t("bid.sentTitle"), t("bid.sentBody"));
        navigation.goBack();
        return;
      }
      load();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("bid.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function goOnline() {
    setGoingOnline(true);
    try {
      const res = await api.setOnline(true);
      setOnlineState(res.isOnline);
      haptic.success();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("bid.failed"));
    } finally {
      setGoingOnline(false);
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

  if (!job) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const bidStatus = myBid ? (myBid as { status: string }).status : null;

  // The customer names his price: the pro can accept it as it is, or answer with his own, lower or higher.
  const offer = Number(job.budgetPKR) > 0 ? Number(job.budgetPKR) : 0;
  const step = stepFor(offer || (job.guide as { suggested?: number } | null)?.suggested || 1500);
  const cur = (job.currency as string | undefined) ?? "";
  const diffPct = offer > 0 && price > 0 ? Math.round(((price - offer) / offer) * 100) : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 + insets.bottom }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{job.title as string}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>{job.description as string}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13 }}>
        {job.customerFirstName as string} · {job.distanceBand as string} · {job.areaLabel as string}
      </Text>
      {job.urgency === "SCHEDULED" && typeof job.scheduledAt === "string" && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.accentTint }}>
          <Text style={{ color: colors.accent, fontWeight: "800" }}>{"🗓 " + t("schedule.scheduledFor", { when: windowText(job.scheduledAt, job.scheduledWindowMins as number | null, lang) })}</Text>
        </View>
      )}

      {!online && verificationLevel >= 1 && (
        <Card style={{ marginTop: 20, borderColor: colors.accentBorder }}>
          <Text style={{ color: colors.accent, fontWeight: "700", marginBottom: 10 }}>{t("alerts.goOnlineBid")}</Text>
          <Button title={t("alerts.goOnlineButton")} onPress={goOnline} loading={goingOnline} />
        </Card>
      )}

      {verificationLevel < 1 ? (
        <Card style={{ marginTop: 20, borderColor: colors.accentBorder }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("bid.verifyFirst")}</Text>
        </Card>
      ) : bidStatus === "COUNTERED" ? (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>{t("bid.counteredWith")}</Text>
          <PriceText pkr={(myBid as { counterPricePKR: number }).counterPricePKR ?? 0} size="lg" color={colors.accent} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Button title={t("common.accept")} onPress={() => respondToCounter("accept")} loading={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t("common.decline")} variant="ghost" onPress={() => respondToCounter("decline")} loading={busy} />
            </View>
          </View>
        </Card>
      ) : bidStatus && bidStatus !== "PENDING" ? (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.textMuted }}>
            {t("bid.status")} <Text style={{ color: colors.text, fontWeight: "700" }}>{enumLabel(td, "bid", bidStatus)}</Text>
          </Text>
        </Card>
      ) : (
        <Card style={{ marginTop: 20 }}>
          {offer > 0 && (
            <View style={styles.offerBox}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{t("offer.customerOffer")}</Text>
              <View style={{ marginVertical: 6 }}>
                <PriceText pkr={offer} size="lg" color={colors.accent} />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Chip label={t("offer.accept", { price: `${cur} ${offer.toLocaleString()}` })} active={price === offer} onPress={() => setPrice(offer)} />
                <Chip label={`${t("offer.lower")} (${Math.max(step, offer - step).toLocaleString()})`} onPress={() => setPrice(Math.max(step, offer - step))} />
                <Chip label={`${t("offer.higher")} (${(offer + step).toLocaleString()})`} onPress={() => setPrice(offer + step)} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8 }}>{t("offer.acceptNote")}</Text>
            </View>
          )}
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 14 }}>{myBid ? t("bid.edit") : t("bid.submit")}</Text>

          <Text style={styles.label}>{t("bid.price")}</Text>
          <View style={styles.stepperRow}>
            <Pressable onPress={() => setPrice((p) => Math.max(step, p - step))} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>−</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <PriceText pkr={price} size="lg" />
            </View>
            <Pressable onPress={() => setPrice((p) => p + step)} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
          </View>

          {offer > 0 && price > 0 && (
            <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "600", color: diffPct > 20 ? colors.dangerSoft : diffPct > 0 ? colors.accent : colors.success }}>
              {diffPct === 0 ? t("offer.same") : diffPct < 0 ? t("offer.below", { pct: Math.abs(diffPct) }) : t("offer.above", { pct: diffPct })}
            </Text>
          )}

          <Text style={[styles.label, { marginTop: 18 }]}>{t("bid.eta")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            {ETA_MINUTES.map((m) => (
              <Chip
                key={m}
                label={m < 60 ? t("time.minutesShort", { n: m }) : t("time.hoursShort", { n: m / 60 })}
                active={eta === String(m)}
                onPress={() => setEta(String(m))}
              />
            ))}
          </View>
          <View style={{ marginTop: 8 }}>
            <Field label={t("bid.customEta")} keyboardType="number-pad" value={eta} onChangeText={setEta} />
          </View>

          {winHint && (
            <Text style={{ color: colors.accent, fontWeight: "700", marginBottom: 10 }}>
              💡 {t("bid.winHint", { pct: Math.round(winHint.winProbability * 100) })} {winHint.isHeuristic ? t("bid.estimate") : ""}
            </Text>
          )}
          <Field label={t("bid.partsLabel")} value={partsNote} onChangeText={setPartsNote} placeholder={t("bid.partsPlaceholder")} />
          <Text style={{ color: colors.textFainter, fontSize: 11, marginTop: -10, marginBottom: 14 }}>{t("bid.partsNote")}</Text>
          <Field label={t("bid.message")} multiline numberOfLines={3} value={message} onChangeText={setMessage} />
          <Button title={myBid ? t("bid.update") : t("bid.send")} onPress={submitBid} loading={busy} disabled={!price || !eta} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  offerBox: { backgroundColor: colors.accentTint, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgElevated2,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: { color: colors.accent, fontSize: 22, fontWeight: "800" },
});
