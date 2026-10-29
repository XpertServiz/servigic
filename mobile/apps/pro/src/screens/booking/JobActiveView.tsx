// "Job in progress" layout (D3-JobActive): timer, agreed price, a checklist and
// the "Mark job complete" CTA. No ads here — the pro is mid-task.
// Optional "photo of finished work": camera or gallery, under 2 MB (kept small for UploadThing's free storage).
import React, { useEffect, useState } from "react";
import { currencyCode, useCurrencyCode } from "../../lib/currency";
import { View, Text, Pressable, ScrollView, StyleSheet, Image, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as api from "../../lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientButton } from "../../components/ds";
import { Icon } from "../../components/Icon";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import type { BookingActions, BookingData } from "./types";

const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function JobActiveView({ booking, actions }: { booking: BookingData; actions: BookingActions }) {
  useCurrencyCode(); // re-render when the currency (SAR, PKR ...) becomes known
  const t = useT();
  const insets = useSafeAreaInsets();
  const startedAt = booking.timeline?.WORKING ? new Date(booking.timeline.WORKING).getTime() : Date.now();
  const [now, setNow] = useState(Date.now());
  // Checklist is an on-device reminder (arrived is implied by the status).
  // Nothing here blocks completing the job.
  const [completed, setCompleted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(booking.completionPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);

  async function addPhoto(source: "camera" | "gallery") {
    const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.5 };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const info = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
    const size = asset.fileSize ?? (info && info.exists ? info.size : 0);
    if (size > PHOTO_MAX_BYTES) {
      Alert.alert(t("active.photo"), t("active.photoTooBig", { size: (size / 1024 / 1024).toFixed(1) }));
      return;
    }
    setUploading(true);
    try {
      setPhotoUrl(await api.uploadCompletionPhoto(booking.id, asset.uri, asset.mimeType ?? "image/jpeg"));
      Alert.alert(t("active.photo"), t("active.photoSaved"));
    } catch (e) {
      Alert.alert(t("active.photo"), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploading(true);
    try {
      await api.removeCompletionPhoto(booking.id);
      setPhotoUrl(null);
    } catch (e) {
      Alert.alert(t("active.photo"), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const items: { label: string; checked: boolean; onPress?: () => void }[] = [
    { label: t("active.arrived"), checked: true },
    { label: t("active.completed"), checked: completed, onPress: () => setCompleted((v) => !v) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 22, paddingBottom: 24 }}>
        <View style={styles.headerRow}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t("active.title")}</Text>
          <View style={styles.timer}>
            <Text style={styles.timerText}>{formatElapsed(now - startedAt)}</Text>
          </View>
        </View>

        <Text style={styles.jobTitle}>{booking.jobTitle}</Text>
        <Text style={styles.jobSub}>
          {booking.otherPartyName} · {booking.exactAddress ?? booking.areaLabel ?? ""}
        </Text>

        <View style={styles.priceCard}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t("active.agreedPrice")}</Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.accent }}>{currencyCode()} {booking.totalPKR.toLocaleString()}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t("active.checklist")}</Text>
        <View style={{ gap: 10 }}>
          {items.map((item) => (
            <Pressable key={item.label} onPress={item.onPress} disabled={!item.onPress} style={styles.checkRow}>
              <View style={[styles.box, item.checked && styles.boxChecked]}>{item.checked && <Icon name="check" size={13} color={colors.accentForeground} />}</View>
              <Text style={{ fontSize: 13, color: item.checked ? colors.text : colors.textSecondary }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.photoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[styles.box, photoUrl ? styles.boxChecked : null]}>{photoUrl && <Icon name="check" size={13} color={colors.accentForeground} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.text }}>{t("active.photo")}</Text>
              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{t("active.photoOptional")}</Text>
            </View>
            {uploading && <ActivityIndicator color={colors.accent} />}
          </View>
          {photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable style={styles.photoBtn} onPress={() => addPhoto("camera")} disabled={uploading}>
              <Text style={styles.photoBtnText}>📷  {t("active.photoCamera")}</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => addPhoto("gallery")} disabled={uploading}>
              <Text style={styles.photoBtnText}>🖼️  {t("active.photoGallery")}</Text>
            </Pressable>
            {photoUrl && (
              <Pressable style={[styles.photoBtn, { flex: 0, paddingHorizontal: 14 }]} onPress={removePhoto} disabled={uploading}>
                <Text style={[styles.photoBtnText, { color: colors.textMuted }]}>{t("active.photoRemove")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingTop: 8 }}>
        <GradientButton title={t("active.markComplete")} onPress={actions.advance} disabled={actions.busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timer: { backgroundColor: "rgba(245,166,35,0.14)", borderWidth: 1, borderColor: "rgba(245,166,35,0.35)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  timerText: { color: colors.accent, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  jobTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 16, marginBottom: 4 },
  jobSub: { color: colors.textMuted, fontSize: 13 },
  priceCard: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.15)",
    borderRadius: 16,
    padding: 16,
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: { fontSize: 13, color: colors.textMuted, marginTop: 22, marginBottom: 10 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#4A443A", alignItems: "center", justifyContent: "center" },
  boxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  photoCard: { marginTop: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14 },
  photo: { width: "100%", height: 180, borderRadius: 10, marginTop: 12 },
  photoBtn: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: "rgba(245,166,35,0.35)", backgroundColor: "rgba(245,166,35,0.08)" },
  photoBtnText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
});
