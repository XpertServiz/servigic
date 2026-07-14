import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { CountdownRing, haptic } from "../components/ds";
import { sound } from "../lib/sound";
import { colors, radius } from "../lib/theme";

const RING_SECONDS = 60;

export interface IncomingJob {
  id: string;
  title: string;
  categoryIcon: string;
  categoryName: string;
  areaLabel: string;
  urgency: string;
}

export default function IncomingJobRing({
  job,
  onView,
  onDismiss,
}: {
  job: IncomingJob;
  onView: () => void;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(RING_SECONDS);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    haptic.heavy();
    sound.startRing();
    const pulseLoop = setInterval(() => haptic.heavy(), 2000);
    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tick);
          sound.stopRing();
          onDismiss();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      clearInterval(tick);
      clearInterval(pulseLoop);
      sound.stopRing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <View style={styles.card}>
        <CountdownRing totalSeconds={RING_SECONDS} remainingSeconds={remaining} size={72} color={colors.secondary}>
          <Text style={{ fontSize: 28 }}>{job.categoryIcon}</Text>
        </CountdownRing>

        <Text style={styles.category}>
          {job.categoryName} {job.urgency === "EMERGENCY" ? "· Emergency 🔴" : ""}
        </Text>
        <Text style={styles.area}>{job.areaLabel}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>

        <Pressable style={styles.viewBtn} onPress={onView}>
          <Text style={styles.viewBtnText}>VIEW & BID</Text>
        </Pressable>
        <Pressable style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>Dismiss</Text>
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
    backgroundColor: "rgba(10,11,15,0.96)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 999,
    padding: 24,
  },
  card: { alignItems: "center", width: "100%", maxWidth: 360 },
  category: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 20, textAlign: "center" },
  area: { color: colors.textMuted, fontSize: 16, fontWeight: "600", marginTop: 8, textAlign: "center" },
  title: { color: colors.textMuted, fontSize: 14, marginTop: 10, textAlign: "center" },
  viewBtn: {
    marginTop: 32,
    width: "100%",
    height: 64,
    borderRadius: radius.button,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.secondary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  viewBtnText: { color: colors.secondaryForeground, fontWeight: "800", fontSize: 18, letterSpacing: 0.5 },
  dismissBtn: { marginTop: 16, padding: 12 },
  dismissText: { color: colors.textMuted, fontWeight: "700" },
});
