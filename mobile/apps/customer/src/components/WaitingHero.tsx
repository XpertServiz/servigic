// "Waiting for bids" hero: the number of nearby pros alerted, huge (about a third of the screen) and counting up
// as pros are notified. When the first bid arrives it shrinks into a compact header row above the bid cards.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

export function WaitingHero({ count, compact }: { count: number | null; compact: boolean }) {
  const t = useT();
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = Math.round(windowHeight / 3);
  const numberSize = Math.round(heroHeight * 0.58);

  // Counts up from wherever it was to the new total (so a widened search visibly adds pros).
  const [shown, setShown] = useState(0);
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => value.removeListener(id);
  }, [value]);
  useEffect(() => {
    if (count == null) return;
    Animated.timing(value, { toValue: count, duration: Math.min(1800, 500 + count * 120), easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [count, value]);

  // 0 = full hero, 1 = compact header.
  const shrink = useRef(new Animated.Value(compact ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(shrink, { toValue: compact ? 1 : 0, duration: 500, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [compact, shrink]);
  const containerHeight = shrink.interpolate({ inputRange: [0, 1], outputRange: [heroHeight, 48] });
  const heroOpacity = shrink.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: "clamp" });
  const compactOpacity = shrink.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: "clamp" });

  // A gentle pulse behind the number while we are still waiting.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (count == null) {
    return (
      <View style={[styles.wrap, { height: heroHeight }]}>
        <Text style={styles.alerting}>{t("waiting.heroAlerting")}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.wrap, { height: containerHeight }]}>
      <Animated.View style={[styles.heroLayer, { opacity: heroOpacity }]} pointerEvents="none">
        <Animated.View
          style={[styles.glow, { width: numberSize * 1.6, height: numberSize * 1.6, borderRadius: numberSize, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] }) }]}
        />
        <Text style={[styles.number, { fontSize: numberSize, lineHeight: numberSize * 1.1 }]} accessibilityRole="header">
          {shown}
        </Text>
        <Text style={styles.label}>{t("waiting.heroLabel", { n: count })}</Text>
      </Animated.View>

      <Animated.View style={[styles.compactLayer, { opacity: compactOpacity }]} pointerEvents="none">
        <Text style={styles.compactText}>📡 {t("waiting.biddingHeader", { n: count })}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", marginTop: 8, marginBottom: 4 },
  heroLayer: { ...StyleSheet.absoluteFill as object, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", backgroundColor: colors.accent },
  number: { color: colors.accent, fontWeight: "900", includeFontPadding: false },
  label: { color: colors.textSecondary, fontSize: 16, fontWeight: "700", marginTop: 2 },
  alerting: { color: colors.textSecondary, fontSize: 18, fontWeight: "700", textAlign: "center", alignSelf: "center", marginTop: 40 },
  compactLayer: { ...StyleSheet.absoluteFill as object, justifyContent: "center", paddingHorizontal: 14, backgroundColor: colors.accentTint, borderRadius: 12, borderWidth: 1, borderColor: colors.accentBorder },
  compactText: { color: colors.accent, fontSize: 14, fontWeight: "800" },
});
