// "Job in progress" layout (D3-JobActive): timer, agreed price, a checklist and
// the "Mark job complete" CTA. No ads here — the pro is mid-task.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientButton } from "../../components/ds";
import { Icon } from "../../components/Icon";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import type { BookingActions, BookingData } from "./types";

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
  const t = useT();
  const insets = useSafeAreaInsets();
  const startedAt = booking.timeline?.WORKING ? new Date(booking.timeline.WORKING).getTime() : Date.now();
  const [now, setNow] = useState(Date.now());
  // Checklist is an on-device reminder (arrived is implied by the status).
  // Nothing here blocks completing the job.
  const [completed, setCompleted] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const items: { label: string; checked: boolean; onPress?: () => void }[] = [
    { label: t("active.arrived"), checked: true },
    { label: t("active.completed"), checked: completed, onPress: () => setCompleted((v) => !v) },
    { label: t("active.photo"), checked: photoTaken, onPress: () => setPhotoTaken((v) => !v) },
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
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.accent }}>PKR {booking.totalPKR.toLocaleString()}</Text>
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
});
