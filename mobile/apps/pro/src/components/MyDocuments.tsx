// My documents: every ID, certificate, licence and insurance document with its status and expiry date, and a way to submit a
// new or renewed one. Nothing changes until the Servigic team approves it (usually 24-48 hours).
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { Button } from "./ui";

const TYPES = ["ID", "POLICE", "LICENSE", "CERTIFICATE", "INSURANCE", "OTHER"] as const;
type DocType = (typeof TYPES)[number];

const TONE: Record<string, string> = {
  VALID: colors.success,
  EXPIRING_SOON: colors.accent,
  EXPIRED: colors.dangerSoft,
  PENDING: colors.accent,
  REJECTED: colors.dangerSoft,
};

/** "31/12/2027" -> ISO date at noon UTC, or null when empty; undefined when invalid. */
function parseDate(text: string): string | null | undefined {
  const s = text.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return undefined;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12));
  return d.getUTCDate() === Number(m[1]) ? d.toISOString() : undefined;
}

export function MyDocuments() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getMyDocuments>> | null>(null);
  const [open, setOpen] = useState<{ type: DocType; label: string } | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState<"" | "upload" | "send">("");

  const load = useCallback(() => {
    api.getMyDocuments().then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!data) return null;
  const label = (type: string) => t(`docs.type.${type}` as "docs.type.ID");

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setBusy("upload");
    try {
      setFileUrl(await api.uploadFile(a.uri, a.fileName ?? "document.jpg", a.mimeType ?? "image/jpeg"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setBusy("");
    }
  }

  async function send() {
    if (!open || !fileUrl) return;
    const expiresAt = parseDate(expiry);
    if (expiresAt === undefined) return Alert.alert(t("common.error"), t("docs.badDate"));
    setBusy("send");
    try {
      await api.submitDocument({ type: open.type, label: open.label.trim() || label(open.type), fileUrl, expiresAt });
      setOpen(null);
      setFileUrl(null);
      setExpiry("");
      Alert.alert(t("docs.submittedTitle"), t("docs.submittedBody"));
      load();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setBusy("");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{"📁 " + t("docs.title")}</Text>
      <Text style={styles.sub}>{t("docs.subtitle")}</Text>
      {data.blocked && (
        <View style={styles.blocked}>
          <Text style={{ color: colors.dangerSoft, fontWeight: "800" }}>{t("docs.blockedTitle")}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>{t("docs.blockedBody")}</Text>
        </View>
      )}
      {data.documents.length === 0 && <Text style={styles.sub}>{t("docs.none")}</Text>}
      {data.documents.map((d) => (
        <View key={d.id} style={styles.row}>
          <Pressable onPress={() => Linking.openURL(d.fileUrl)}>
            <Image source={{ uri: d.fileUrl }} style={styles.thumb} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName}>{d.label}</Text>
            <Text style={styles.meta}>
              {label(d.type)}
              {d.mandatory ? ` · ${t("docs.mandatory")}` : ""}
              {d.expiresAt ? ` · ${t("docs.expires", { date: d.expiresAt.slice(0, 10) })}` : ` · ${t("docs.noExpiry")}`}
            </Text>
            <Text style={[styles.status, { color: TONE[d.status] ?? colors.textMuted }]}>{t(`docs.status.${d.status}` as "docs.status.VALID")}</Text>
            {d.status === "REJECTED" && d.rejectReason ? <Text style={styles.meta}>{t("docs.reason", { reason: d.rejectReason })}</Text> : null}
          </View>
          {d.status !== "PENDING" && (
            <Pressable onPress={() => setOpen({ type: d.type as DocType, label: d.label })} hitSlop={8}>
              <Text style={styles.link}>{t("docs.update")}</Text>
            </Pressable>
          )}
        </View>
      ))}
      <View style={{ marginTop: 10 }}>
        <Button title={t("docs.addNew")} variant="ghost" onPress={() => setOpen({ type: "CERTIFICATE", label: "" })} />
      </View>

      <Modal visible={open !== null} animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 10 }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { fontSize: 19 }]}>{t("docs.submitTitle")}</Text>
            <Text style={styles.sub}>{t("docs.reviewNote")}</Text>
            <Text style={styles.label}>{t("docs.typeLabel")}</Text>
            <View style={styles.chips}>
              {TYPES.map((ty) => (
                <Pressable key={ty} onPress={() => open && setOpen({ ...open, type: ty })} style={[styles.chip, open?.type === ty && styles.chipOn]}>
                  <Text style={[styles.chipText, open?.type === ty && { color: colors.accent }]}>{label(ty)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t("docs.nameLabel")}</Text>
            <TextInput value={open?.label ?? ""} onChangeText={(v) => open && setOpen({ ...open, label: v })} placeholder={open ? label(open.type) : ""} placeholderTextColor={colors.textFainter} style={styles.input} />
            <Text style={styles.label}>{t("docs.expiryLabel")}</Text>
            <TextInput value={expiry} onChangeText={setExpiry} placeholder="31/12/2027" placeholderTextColor={colors.textFainter} keyboardType="numbers-and-punctuation" style={styles.input} />
            <Text style={styles.hint}>{t("docs.expiryHint")}</Text>
            <Pressable onPress={pick} style={styles.pick}>
              {fileUrl ? <Image source={{ uri: fileUrl }} style={{ width: "100%", height: 160, borderRadius: 10 }} resizeMode="contain" /> : <Text style={styles.link}>{busy === "upload" ? "…" : t("docs.pickPhoto")}</Text>}
            </Pressable>
            <Button title={t("docs.send")} onPress={send} loading={busy === "send"} disabled={!fileUrl || busy !== ""} />
            <Pressable onPress={() => setOpen(null)} style={{ alignItems: "center", marginTop: 14 }}>
              <Text style={{ color: colors.textMuted }}>{t("common.cancel")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, marginTop: 14 },
  title: { color: colors.text, fontWeight: "800", fontSize: 15, marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  blocked: { borderWidth: 1, borderColor: colors.dangerSoft, borderRadius: 12, padding: 10, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderColor: colors.borderSoft },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: colors.bg },
  docName: { color: colors.text, fontWeight: "700", fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 11.5, marginTop: 2 },
  status: { fontSize: 12, fontWeight: "800", marginTop: 3 },
  link: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  chipText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.bgElevated },
  hint: { color: colors.textFainter, fontSize: 11, marginTop: 4 },
  pick: { marginVertical: 16, minHeight: 90, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.accentBorder, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 8 },
});
