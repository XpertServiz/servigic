// Photo slideshow behind the sign-in / sign-up screens: a new picture every second, cross-fading, for the country of the phone
// number (Saudi Arabia, Pakistan, UAE, Qatar, Canada, USA, otherwise neutral home-service pictures). The pictures of each app are
// listed in src/lib/authSlides.ts. They fill the top of the screen and fade into the app background so the form stays readable.
// Shared verbatim by apps/customer, apps/pro and apps/admin (the Admin app shows every picture, whatever the country).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { colors } from "../lib/theme";
import { slidesFor } from "../lib/authSlides";

const EVERY_MS = 1000;
const FADE_MS = 450;
const STRIPS = 12;

export function AuthBackdrop({ country, heightFrac = 0.5, dim = 0 }: { country?: string | null; heightFrac?: number; dim?: number }) {
  const { width, height } = useWindowDimensions();
  const images = useMemo(() => slidesFor(country), [country]);
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const shown = useRef(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    shown.current = 0;
    setIndex(0);
    setPrev(null);
    if (images.length < 2) return;
    const timer = setInterval(() => setIndex((x) => (x + 1) % images.length), EVERY_MS);
    return () => clearInterval(timer);
  }, [images]);

  useEffect(() => {
    if (index === shown.current) return;
    setPrev(shown.current);
    shown.current = index;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start(() => setPrev(null));
  }, [index, fade]);

  const boxH = Math.round(height * Math.min(1, heightFrac));
  const full = heightFrac >= 1;
  const stripH = Math.ceil((boxH * 0.4) / STRIPS);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      <View style={{ width, height: boxH }}>
        {prev != null && images[prev] != null && <Image source={images[prev]} style={{ width, height: boxH, position: "absolute" }} resizeMode="cover" fadeDuration={0} />}
        <Animated.Image source={images[index]} style={{ width, height: boxH, position: "absolute", opacity: fade }} resizeMode="cover" fadeDuration={0} />
        {dim > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: dim }]} />}
        {!full && (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            {Array.from({ length: STRIPS }, (_, i) => (
              <View key={i} style={{ height: stripH, backgroundColor: colors.bg, opacity: (i + 1) / STRIPS }} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
