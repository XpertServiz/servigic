import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { CountdownRing, GradientButton, AnimatedTradeIcon, haptic } from "../components/ds";
import { sound, RING_WINDOW_MS } from "../lib/sound";
import { colors } from "../lib/theme";
import { enumLabel } from "../lib/status";
import { useI18n } from "../lib/i18n";

// The offer rings for ~15 s (2–3 loops of the 5.6 s alert) and then moves on —
// a longer window slows dispatch for the customer without helping the pro
// notice any better. Any tap stops the ring immediately.
const RING_SECONDS = Math.round(RING_WINDOW_MS / 1000);

export interface IncomingJob {
  id: string;
  title: string;
  categoryIcon: string;
  categoryName: string;
  areaLabel: string;
  urgency: string;
}

export default function IncomingJobRing({ job, onView, onDismiss }: { job: IncomingJob; onView: () => void; onDismiss: () => void }) {
  const { t, td } = useI18n();
  const [remaining, setRemaining] = useState(RING_SECONDS);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    haptic.heavy();
    sound.startRing({ title: t("ring.notifTitle", { category: job.categoryName }), body: `${job.areaLabel} · ${job.title}` }, onDismiss);
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => {
      clearInterval(tick);
      sound.stopRing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  function respond(action: () => void) {
    sound.stopRing();
    action();
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <View style={styles.card}>
        <CountdownRing totalSeconds={RING_SECONDS} remainingSeconds={remaining} size={76} color={colors.accent}>
          <AnimatedTradeIcon icon={job.categoryIcon} size={28} />
        </CountdownRing>

        <Text style={styles.category}>
          {job.categoryName} {job.urgency === "EMERGENCY" ? `· ${enumLabel(td, "urgency", "EMERGENCY")} 🔴` : ""}
        </Text>
        <Text style={styles.area}>{job.areaLabel}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>

        <View style={{ width: "100%", marginTop: 32 }}>
          <GradientButton title={t("ring.viewBid")} onPress={() => respond(onView)} />
        </View>
        <Pressable style={styles.dismissBtn} onPress={() => respond(onDismiss)}>
          <Text style={styles.dismissText}>{t("ring.dismiss")}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,8,8,0.97)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 999,
    padding: 24,
  },
  card: { alignItems: "center", width: "100%", maxWidth: 360 },
  category: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 20, textAlign: "center" },
  area: { color: colors.textMuted, fontSize: 16, fontWeight: "600", marginTop: 8, textAlign: "center" },
  title: { color: colors.textSecondary, fontSize: 14, marginTop: 10, textAlign: "center" },
  dismissBtn: { marginTop: 16, padding: 12 },
  dismissText: { color: colors.textMuted, fontWeight: "700" },
});
