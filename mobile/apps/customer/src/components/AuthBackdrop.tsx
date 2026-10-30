// The picture at the top of the sign-in / sign-up screens, fading into the app background so the form stays readable. When the picture
// changes (the designs rotate, see src/lib/authDesigns.ts) it cross-fades. Shared by the Customer, Pro and Admin apps.
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { colors } from "../lib/theme";

const STRIPS = 12;
const FADE_MS = 650;

export function AuthBackdrop({ image, heightFrac = 0.5, dim = 0 }: { image: ImageSourcePropType; heightFrac?: number; dim?: number }) {
  const { width, height } = useWindowDimensions();
  const [layers, setLayers] = useState<{ cur: ImageSourcePropType; prev: ImageSourcePropType | null }>({ cur: image, prev: null });
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLayers((l) => (l.cur === image ? l : { cur: image, prev: l.cur }));
  }, [image]);
  useEffect(() => {
    if (!layers.prev) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start(() => setLayers((l) => ({ cur: l.cur, prev: null })));
  }, [layers.cur, layers.prev, fade]);

  const boxH = Math.round(height * Math.min(1, heightFrac));
  const stripH = Math.ceil((boxH * 0.4) / STRIPS);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      {layers.prev && <Animated.Image source={layers.prev} style={{ position: "absolute", top: 0, left: 0, width, height: boxH }} resizeMode="cover" fadeDuration={0} />}
      <Animated.Image source={layers.cur} style={{ width, height: boxH, opacity: layers.prev ? fade : 1 }} resizeMode="cover" fadeDuration={0} />
      {dim > 0 && <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: boxH, backgroundColor: "#000", opacity: dim }} />}
      {heightFrac < 1 && (
        <View style={{ position: "absolute", left: 0, right: 0, top: boxH - stripH * STRIPS }}>
          {Array.from({ length: STRIPS }, (_, i) => (
            <View key={i} style={{ height: stripH, backgroundColor: colors.bg, opacity: (i + 1) / STRIPS }} />
          ))}
        </View>
      )}
    </View>
  );
}
