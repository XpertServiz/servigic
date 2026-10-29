// The picture at the top of the sign-in / sign-up screens, fading into the app background so the form stays readable.
// Each time the screen opens a different design is chosen (see src/lib/authDesigns.ts). Shared by Customer, Pro and Admin apps.
import React from "react";
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { colors } from "../lib/theme";

const STRIPS = 12;

export function AuthBackdrop({ image, heightFrac = 0.5, dim = 0 }: { image: ImageSourcePropType; heightFrac?: number; dim?: number }) {
  const { width, height } = useWindowDimensions();
  const boxH = Math.round(height * Math.min(1, heightFrac));
  const stripH = Math.ceil((boxH * 0.4) / STRIPS);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      <Image source={image} style={{ width, height: boxH }} resizeMode="cover" fadeDuration={0} />
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
