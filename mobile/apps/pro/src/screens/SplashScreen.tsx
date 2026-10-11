import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";
import { GlowBackground } from "../components/ds";
import { LogoMark3D } from "../components/LogoMark";
import { useT } from "../lib/i18n";

// Shown while the session restores. 3D badge, sweeping loading bar, pulsing caption.
export function SplashScreen() {
  const t = useT();
  const bar = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const barLoop = Animated.loop(Animated.timing(bar, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    const fadeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    barLoop.start();
    fadeLoop.start();
    return () => {
      barLoop.stop();
      fadeLoop.stop();
    };
  }, [bar, fade]);

  const barX = bar.interpolate({ inputRange: [0, 1], outputRange: [-56, 140] });
  const captionOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <View style={styles.container}>
      <GlowBackground cy="40%" opacity={0.18} />
      <LogoMark3D size={120} />
      <Text style={styles.brand}>SERVIGIC</Text>
      <Text style={styles.pro}>PRO</Text>
      <View style={styles.track}>
        <Animated.View style={{ width: 56, height: 4, transform: [{ translateX: barX }] }}>
          <LinearGradient
            colors={["transparent", colors.accent, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, borderRadius: 2 }}
          />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.caption, { opacity: captionOpacity }]}>{t("splash.pro")}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  brand: { color: colors.text, fontSize: 21, fontWeight: "800", letterSpacing: 3, marginTop: 28 },
  pro: { color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 4, marginTop: 5 },
  track: { width: 140, height: 4, borderRadius: 2, backgroundColor: "rgba(245,166,35,0.12)", overflow: "hidden", marginTop: 36 },
  caption: { color: colors.textMuted, fontSize: 12, marginTop: 14 },
});
