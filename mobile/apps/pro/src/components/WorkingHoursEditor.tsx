// Working hours: any number of time windows per weekday, added, edited or removed freely, or "always available".
// Job alerts are only pushed during these hours; scheduled jobs are matched to the hours of their own day.
import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { Button } from "./ui";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = (typeof DAYS)[number];
type Win = { start: number; end: number };
type Hours = Record<Day, Win[]>;

const EMPTY: Hours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24 === 0 && m === 1440 ? 24 : Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const TIMES = Array.from({ length: 48 }, (_, i) => i * 30); // 00:00 … 23:30

// Mon=2025-01-06 … for the localized weekday name.
const dayName = (d: Day, lang: string) => {
  const base = new Date(2025, 0, 6 + DAYS.indexOf(d));
  try {
    return new Intl.DateTimeFormat(lang, { weekday: "long" }).format(base);
  } catch {
    return d;
  }
};

export function WorkingHoursEditor() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [hours, setHours] = useState<Hours | null>(null);
  const [custom, setCustom] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<{ day: Day; start: number | null } | null>(null);

  useEffect(() => {
    api
      .getAvailability()
      .then(({ availability }) => {
        setHours((availability as Hours | null) ?? EMPTY);
        setCustom(Boolean(availability));
      })
      .catch(() => setHours(EMPTY))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !hours) return null;

  const update = (day: Day, list: Win[]) => setHours({ ...hours, [day]: list.sort((a, b) => a.start - b.start) });

  async function save() {
    setSaving(true);
    try {
      await api.saveAvailability(custom ? hours : null);
      Alert.alert(t("hours.saved"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.tryAgain"));
    } finally {
      setSaving(false);
    }
  }

  function pick(m: number) {
    if (!adding) return;
    if (adding.start === null) return setAdding({ ...adding, start: m });
    if (m <= adding.start) return;
    update(adding.day, [...hours![adding.day], { start: adding.start, end: m }]);
    setAdding(null);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{"🕘 " + t("hours.title")}</Text>
      <Text style={styles.sub}>{t("hours.subtitle")}</Text>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setCustom(false)} style={[styles.mode, !custom && styles.modeOn]}>
          <Text style={[styles.modeText, !custom && styles.modeTextOn]}>{t("hours.always")}</Text>
        </Pressable>
        <Pressable onPress={() => setCustom(true)} style={[styles.mode, custom && styles.modeOn]}>
          <Text style={[styles.modeText, custom && styles.modeTextOn]}>{t("hours.custom")}</Text>
        </Pressable>
      </View>

      {custom &&
        DAYS.map((d) => (
          <View key={d} style={styles.dayRow}>
            <Text style={styles.day}>{dayName(d, lang)}</Text>
            <View style={styles.wins}>
              {hours[d].length === 0 && <Text style={styles.off}>{t("hours.dayOff")}</Text>}
              {hours[d].map((w, i) => (
                <Pressable key={`${w.start}-${w.end}`} onPress={() => update(d, hours[d].filter((_, j) => j !== i))} style={styles.win}>
                  <Text style={styles.winText}>{`${hhmm(w.start)}–${hhmm(w.end)}  ✕`}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setAdding({ day: d, start: null })} style={styles.add}>
                <Text style={styles.addText}>{t("hours.add")}</Text>
              </Pressable>
              {hours[d].length > 0 && (
                <Pressable onPress={() => setHours(Object.fromEntries(DAYS.map((x) => [x, hours[d].map((w) => ({ ...w }))])) as Hours)}>
                  <Text style={styles.copy}>{t("hours.copyAll")}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

      <View style={{ marginTop: 12 }}>
        <Button title={t("hours.save")} onPress={save} loading={saving} />
      </View>

      <Modal visible={adding !== null} transparent animationType="fade" onRequestClose={() => setAdding(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={styles.title}>{adding?.start === null ? t("hours.from") : `${t("hours.to")} (${t("hours.from")} ${hhmm(adding?.start ?? 0)})`}</Text>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={styles.grid}>
              {(adding?.start === null ? TIMES : [...TIMES.filter((m) => m > (adding?.start ?? 0)), 1440]).map((m) => (
                <Pressable key={m} onPress={() => pick(m)} style={styles.time}>
                  <Text style={styles.timeText}>{hhmm(m)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setAdding(null)} style={{ alignItems: "center", marginTop: 12 }}>
              <Text style={{ color: colors.textMuted }}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, marginTop: 14 },
  title: { color: colors.text, fontWeight: "800", fontSize: 15, marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  mode: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  modeOn: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  modeText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12.5 },
  modeTextOn: { color: colors.accent },
  dayRow: { paddingVertical: 8, borderTopWidth: 1, borderColor: colors.borderSoft },
  day: { color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: 6 },
  wins: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  off: { color: colors.textFainter, fontSize: 12 },
  win: { borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.accentTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  winText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  add: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.accentBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  addText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  copy: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline", marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  time: { width: "22%", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center" },
  timeText: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
