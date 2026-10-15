// The Servigic 3D logo for the welcome-back / sign-in screens: the same extruded amber "S" with the red live dot
// as the website, as a small animated WebP (40 frames, ~8 s swing loop, transparent) - no 3D engine involved.
// Android plays animated WebP natively through the standard <Image>; where it cannot animate it shows the first frame.
// Shared by apps/customer and apps/pro.
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet } from "react-native";

const ASPECT = 226 / 200; // frame height / width

export function WelcomeLogo({ width = 150 }: { width?: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);
  return (
    <Animated.View style={[styles.wrap, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
      <Image
        source={require("../../assets/logo-3d.webp")}
        style={{ width, height: Math.round(width * ASPECT) }}
        resizeMode="contain"
        accessible={false}
        importantForAccessibility="no"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: 8 },
});
