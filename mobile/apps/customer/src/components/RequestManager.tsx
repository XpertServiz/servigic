// What the customer can still do with a request at its current stage, with the rule for that stage in plain words:
// open (edit, cancel, keep open longer), closed without a pro (reopen), booked (no more edits: open the booking, message the pro).
import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { Button, Field } from "./ui";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";

type Job = Record<string, unknown>;

export function RequestManager({ job, onChanged, onOpenBooking, onClosed }: { job: Job; onChanged: () => void; onOpenBooking: (bookingId: string) => void; onClosed: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "cancel" | "keep">("");
  const [title, setTitle] = useState(String(job.title ?? ""));
  const [description, setDescription] = useState(String(job.description ?? ""));
  const [offer, setOffer] = useState(job.budgetPKR ? String(job.budgetPKR) : "");

  const status = String(job.status);
  const bookingId = typeof job.bookingId === "string" ? job.bookingId : null;
  const closesAt = typeof job.biddingClosesAt === "string" ? new Date(job.biddingClosesAt) : null;
  const closingSoon = Boolean(closesAt && closesAt.getTime() - Date.now() < 24 * 60 * 60 * 1000);

  async function save() {
    setBusy("save");
    try {
      await api.editJob(String(job.id), { title: title.trim(), description: description.trim(), budgetPKR: offer ? Number(offer) : null });
      setEditing(false);
      onChanged();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setBusy("");
    }
  }

  function cancel() {
    Alert.alert(t("request.cancelTitle"), t("request.cancelBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("request.cancelConfirm"),
        style: "destructive",
        onPress: async () => {
          setBusy("cancel");
          try {
            await api.cancelJob(String(job.id));
            onClosed();
          } catch (e) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
          } finally {
            setBusy("");
          }
        },
      },
    ]);
  }

  async function keepOpen() {
    setBusy("keep");
    try {
      const res = await api.keepJobOpen(String(job.id));
      Alert.alert(t("request.keptTitle"), t("request.keptBody", { days: res.days }));
      onChanged();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setBusy("");
    }
  }

  let rule = "";
  if (bookingId) rule = t("request.ruleBooked");
  else if (status === "OPEN") rule = t("request.ruleOpen");
  else if (status === "EXPIRED") rule = t("request.ruleExpired");
  else if (status === "CANCELLED") rule = t("request.ruleCancelled");
  if (!rule) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.ruleTitle}>{"ℹ️ " + t("request.whatYouCanDo")}</Text>
      <Text style={styles.rule}>{rule}</Text>

      {job.canEdit === true && (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button title={"✏️ " + t("request.edit")} variant="ghost" onPress={() => setEditing(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title={t("request.cancel")} variant="ghost" onPress={cancel} loading={busy === "cancel"} />
          </View>
        </View>
      )}
      {status === "OPEN" && !bookingId && closingSoon && (
        <View style={{ marginTop: 8 }}>
          <Button title={t("request.keepOpen")} onPress={keepOpen} loading={busy === "keep"} />
        </View>
      )}
      {job.canReopen === true && (
        <View style={{ marginTop: 8 }}>
          <Button title={t("request.reopen")} onPress={keepOpen} loading={busy === "keep"} />
        </View>
      )}
      {bookingId && (
        <View style={{ marginTop: 8 }}>
          <Button title={t("request.openBooking")} onPress={() => onOpenBooking(bookingId)} />
        </View>
      )}

      <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 10 }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 6 }}>{t("request.edit")}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12.5, marginBottom: 14, lineHeight: 18 }}>{t("request.editNote")}</Text>
            <Field label={t("post.jobTitle")} value={title} onChangeText={setTitle} />
            <Field label={t("post.description")} multiline numberOfLines={4} value={description} onChangeText={setDescription} />
            <Field label={t("offer.title")} keyboardType="number-pad" value={offer} onChangeText={(v) => setOffer(v.replace(/[^0-9]/g, ""))} />
            <Button title={t("request.save")} onPress={save} loading={busy === "save"} disabled={title.trim().length < 5 || description.trim().length < 10} />
            <Pressable onPress={() => setEditing(false)} style={{ marginTop: 14, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted }}>{t("common.cancel")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.bgElevated },
  ruleTitle: { color: colors.text, fontWeight: "800", fontSize: 13.5, marginBottom: 4 },
  rule: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18 },
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
});
