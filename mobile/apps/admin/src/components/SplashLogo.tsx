// The splash-screen Servigic logo (the amber "S" with the red live dot) for the sign-in screens, with the red dot
// travelling around the S. The "S" is cut from the app's own splash image (assets/logo-s.png); the dot and its pulse
// ring are drawn natively, so nothing here needs an image decoder or a 3D engine. Shared by apps/customer and apps/pro.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

const S_ASPECT = 220 / 133; // logo-s.png height / width
const STEPS = 48; // points used to turn the orbit angle into x / y (native-driver friendly)

export function SplashLogo({ size = 96 }: { size?: number }) {
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sw = size;
  const sh = Math.round(size * S_ASPECT);
  // the box the dot travels in: an ellipse that clears the S on every side
  const rx = sw * 0.78;
  const ry = sh * 0.7;
  const box = { w: Math.round(rx * 2 + 44), h: Math.round(ry * 2 + 44) };

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
    const ring = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    ring.start();
    return () => {
      loop.stop();
      ring.stop();
    };
  }, [orbit, pulse]);

  // start at the top right, where the dot sits in the splash image, then go all the way around
  const start = -Math.PI / 3;
  const input = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);
  const x = orbit.interpolate({ inputRange: input, outputRange: input.map((t) => Math.cos(start + t * Math.PI * 2) * rx) });
  const y = orbit.interpolate({ inputRange: input, outputRange: input.map((t) => Math.sin(start + t * Math.PI * 2) * ry) });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  return (
    <View style={[styles.box, { width: box.w, height: box.h }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Image source={require("../../assets/logo-s.png")} style={{ width: sw, height: sh }} resizeMode="contain" />
      <Animated.View style={[styles.dotWrap, { transform: [{ translateX: x }, { translateY: y }] }]} pointerEvents="none">
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <View style={styles.dot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  dotWrap: { position: "absolute", width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  ring: { position: "absolute", width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#EF4444" },
});
