// Scheduling a job (like reserving a ride): the day first, then the arrival window on that day, or "any time that day".
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { bookableDays, dayPart, flexibleFor, sameDay, slotsFor, timeLabel, windowText, type DayPart } from "../lib/scheduleSlots";

export type ScheduleValue = { scheduledAt: string; scheduledWindowMins: number };

const PARTS: { key: DayPart; icon: string }[] = [
  { key: "morning", icon: "🌅" },
  { key: "afternoon", icon: "☀️" },
  { key: "evening", icon: "🌙" },
];

export function SchedulePicker({ value, onChange }: { value: ScheduleValue | null; onChange: (v: ScheduleValue | null) => void }) {
  const { t, lang } = useI18n();
  const locale = lang;
  const days = useMemo(() => bookableDays(), []);
  const [day, setDay] = useState<Date | null>(value ? new Date(value.scheduledAt) : null);
  const slots = useMemo(() => (day ? slotsFor(day) : []), [day]);
  const flexible = useMemo(() => (day ? flexibleFor(day) : null), [day]);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const chosen = value ? new Date(value.scheduledAt).getTime() : null;
  const isFlexible = Boolean(value && value.scheduledWindowMins > 60);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(locale, o).format(d);
    } catch {
      return d.toDateString();
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.step}>{t("schedule.stepDay")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {days.map((d) => {
          const active = Boolean(day && sameDay(d, day));
          const top = sameDay(d, today) ? t("schedule.today") : sameDay(d, tomorrow) ? t("schedule.tomorrow") : fmt(d, { weekday: "short" });
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => {
                setDay(d);
                onChange(null);
              }}
              style={[styles.day, active && styles.active]}
            >
              <Text style={[styles.dayTop, active && styles.activeText]}>{top}</Text>
              <Text style={[styles.dayNum, active && styles.activeText]}>{d.getDate()}</Text>
              <Text style={[styles.dayTop, active && styles.activeText]}>{fmt(d, { month: "short" })}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {day && (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.step}>{t("schedule.stepTime")}</Text>
          {flexible && (
            <Pressable onPress={() => onChange({ scheduledAt: flexible.start.toISOString(), scheduledWindowMins: flexible.minutes })} style={[styles.flex, isFlexible && styles.active]}>
              <Text style={[styles.slotText, isFlexible && styles.activeText]}>
                {"🕐 " + t("schedule.anyTime", { from: timeLabel(flexible.start, locale), to: timeLabel(new Date(flexible.start.getTime() + flexible.minutes * 60_000), locale) })}
              </Text>
              <Text style={{ color: colors.success, fontSize: 11, marginTop: 2 }}>{t("schedule.anyTimeHint")}</Text>
            </Pressable>
          )}
          {PARTS.map((p) => {
            const list = slots.filter((s) => dayPart(s.start) === p.key);
            if (list.length === 0) return null;
            return (
              <View key={p.key} style={{ marginBottom: 10 }}>
                <Text style={styles.part}>{`${p.icon} ${t(`schedule.${p.key}` as "schedule.morning")}`}</Text>
                <View style={styles.grid}>
                  {list.map((s) => {
                    const active = !isFlexible && chosen === s.start.getTime();
                    return (
                      <Pressable key={s.start.toISOString()} onPress={() => onChange({ scheduledAt: s.start.toISOString(), scheduledWindowMins: s.minutes })} style={[styles.slot, active && styles.active]}>
                        <Text style={[styles.slotText, active && styles.activeText]}>
                          {timeLabel(s.start, locale)}–{timeLabel(new Date(s.start.getTime() + s.minutes * 60_000), locale)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {value && (
        <View style={styles.summary}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>{"✅ " + windowText(value.scheduledAt, value.scheduledWindowMins, locale)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 3, lineHeight: 16 }}>{t("schedule.reminder")}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.bgElevated, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, marginBottom: 18 },
  step: { color: colors.text, fontWeight: "800", fontSize: 13, marginBottom: 8 },
  day: { width: 62, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", backgroundColor: colors.bg },
  dayTop: { color: colors.textMuted, fontSize: 10.5, textTransform: "uppercase" },
  dayNum: { color: colors.text, fontSize: 19, fontWeight: "800", marginVertical: 1 },
  active: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  activeText: { color: colors.accent },
  part: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "31%", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", backgroundColor: colors.bg },
  slotText: { color: colors.text, fontSize: 12.5, fontWeight: "600" },
  flex: { padding: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 10, backgroundColor: colors.bg },
  summary: { marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(30,194,139,0.4)", backgroundColor: "rgba(30,194,139,0.08)" },
});
