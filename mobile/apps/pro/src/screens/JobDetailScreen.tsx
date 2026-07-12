import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Card, Field } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

export default function JobDetailScreen({ route }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [myBid, setMyBid] = useState<Record<string, unknown> | null>(null);
  const [verificationLevel, setVerificationLevel] = useState(0);
  const [price, setPrice] = useState("");
  const [eta, setEta] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [winHint, setWinHint] = useState<{ winProbability: number; isHeuristic: boolean } | null>(null);

  const load = useCallback(() => {
    api.getProviderJobDetail(jobId).then((data) => {
      setJob(data.job);
      setMyBid(data.myBid);
      setVerificationLevel(data.verificationLevel);
      if (data.myBid) {
        setPrice(String((data.myBid as { pricePKR: number }).pricePKR));
        setEta(String((data.myBid as { etaMinutes: number }).etaMinutes));
      }
    });
  }, [jobId]);

  useFocusEffect(load);

  useEffect(() => {
    if (!price || !eta || Number(price) <= 0 || Number(eta) <= 0) {
      setWinHint(null);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .getBidWinProbability(jobId, Number(price), Number(eta))
        .then(setWinHint)
        .catch(() => setWinHint(null));
    }, 500);
    return () => clearTimeout(timeout);
  }, [jobId, price, eta]);

  async function submitBid() {
    setBusy(true);
    try {
      await api.submitBid({ jobId, pricePKR: Number(price), etaMinutes: Number(eta), message: message || undefined });
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
          <Text style={{ color: colors.text, fontWeight: "700" }}>
            Customer countered with PKR {(myBid as { counterPricePKR: number }).counterPricePKR?.toLocaleString()}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Accept" onPress={() => respondToCounter("accept")} loading={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Decline" variant="danger" onPress={() => respondToCounter("decline")} loading={busy} />
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
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 10 }}>{myBid ? "Edit your bid" : "Submit a bid"}</Text>
          <Field label="Price (PKR)" keyboardType="number-pad" value={price} onChangeText={setPrice} />
          <Field label="ETA (minutes)" keyboardType="number-pad" value={eta} onChangeText={setEta} />
          {winHint && (
            <Text style={{ color: colors.accent, fontWeight: "700", marginBottom: 10 }}>
              💡 Price to win: ~{Math.round(winHint.winProbability * 100)}% {winHint.isHeuristic ? "(estimate)" : ""}
            </Text>
          )}
          <Field label="Message (optional)" multiline numberOfLines={3} value={message} onChangeText={setMessage} />
          <Button title={myBid ? "Update Bid" : "Submit Bid"} onPress={submitBid} loading={busy} disabled={!price || !eta} />
        </Card>
      )}
    </ScrollView>
  );
}
