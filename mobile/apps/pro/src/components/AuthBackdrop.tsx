// Soft slideshow behind the sign-in / sign-up screens: line-art of the trades (plumber, electrician, carpenter, AC technician,
// painter) cross-fading every few seconds at a very low opacity. The logo, card and colours of the screen stay as they are.
// Shared verbatim by apps/customer and apps/pro.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { SvgXml } from "react-native-svg";
import { AUTH_SCENES } from "../lib/authScenes";
import { colors } from "../lib/theme";

const STEP_MS = 5500;
const MAX_OPACITY = 0.16;

export function AuthBackdrop() {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const fades = useRef(AUTH_SCENES.map((_, i) => new Animated.Value(i === 0 ? MAX_OPACITY : 0))).current;

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % AUTH_SCENES.length), STEP_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    AUTH_SCENES.forEach((_, i) => {
      Animated.timing(fades[i], { toValue: i === index ? MAX_OPACITY : 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    });
  }, [index, fades]);

  const size = Math.max(width, height * 0.62);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {AUTH_SCENES.map((s, i) => (
        <Animated.View key={s.key} style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", opacity: fades[i] }]}>
          <SvgXml xml={s.svg.replace("currentColor", colors.accent)} width={size} height={size * 0.75} />
        </Animated.View>
      ))}
    </View>
  );
}
