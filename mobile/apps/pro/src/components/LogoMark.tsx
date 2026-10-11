// The "S" brandmark as a layered, extruded badge with a slow 3D sway and a
// light sweep — used on the splash screens (redesign spec §1). It is built from
// stacked views rather than a true 3D render; for the final brand animation
// swap this component for a Lottie / pre-rendered 3D asset without touching the
// screens that use it. Shared verbatim by apps/customer and apps/pro.
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";

const DEPTH_LAYERS = [
  { color: "#2E1F08", depth: 5 },
  { color: "#3C290A", depth: 4 },
  { color: "#4A330C", depth: 3 },
  { color: "#58390E", depth: 2 },
  { color: "#6A4812", depth: 1 },
];

export function LogoMark3D({ size = 120 }: { size?: number }) {
  const sway = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1100),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    swayLoop.start();
    shineLoop.start();
    return () => {
      swayLoop.stop();
      shineLoop.stop();
    };
  }, [sway, shine]);

  const rotateY = sway.interpolate({ inputRange: [0, 1], outputRange: ["-26deg", "26deg"] });
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-size * 1.1, size * 1.1] });
  const radius = size * 0.27;

  return (
    <View style={{ width: size + 16, height: size + 16, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: size, height: size, transform: [{ perspective: 900 }, { rotateY }] }}>
        {DEPTH_LAYERS.map((layer) => {
          // Deeper layers trail the face, shifting with the sway so the badge
          // reads as a solid slab with real thickness.
          const dx = sway.interpolate({ inputRange: [0, 1], outputRange: [layer.depth * 1.8, -layer.depth * 1.8] });
          return (
            <Animated.View
              key={layer.depth}
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: layer.color,
                transform: [{ translateX: dx }, { translateY: layer.depth * 1.2 }],
              }}
            />
          );
        })}
        <LinearGradient
          colors={["#FFE1A3", colors.accent, colors.accentDeep]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.accent,
            shadowOpacity: 0.35,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: 14,
          }}
        >
          <Text style={{ fontSize: size * 0.47, fontWeight: "900", color: colors.accentForeground, fontFamily: "serif" }}>S</Text>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -size * 0.2,
              width: size * 0.35,
              height: size * 1.4,
              transform: [{ translateX: shineX }, { rotate: "18deg" }],
            }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.65)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
