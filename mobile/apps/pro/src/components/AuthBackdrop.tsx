// Soft animated background behind the sign-in / sign-up screens: hand-drawn chalk doodles of the trades (electrician: bulb,
// plug, screwdriver; AC technician: AC unit, fan, wrench) in the brand amber on a transparent background, "boiling" like a
// hand-drawn animation, at a low opacity. The two scenes cross-fade every few seconds. The 3D logo, the card and the colours
// of the screen stay exactly as they are. Plain image frames: no video player, light on any phone.
// Shared verbatim by apps/customer and apps/pro.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from "react-native";

const SCENES = [
  [
    require("../../assets/doodles/elec_0.webp"),
    require("../../assets/doodles/elec_1.webp"),
    require("../../assets/doodles/elec_2.webp"),
    require("../../assets/doodles/elec_3.webp"),
    require("../../assets/doodles/elec_4.webp"),
    require("../../assets/doodles/elec_5.webp"),
    require("../../assets/doodles/elec_6.webp"),
    require("../../assets/doodles/elec_7.webp"),
    require("../../assets/doodles/elec_8.webp"),
  ],
  [
    require("../../assets/doodles/ac_0.webp"),
    require("../../assets/doodles/ac_1.webp"),
    require("../../assets/doodles/ac_2.webp"),
    require("../../assets/doodles/ac_3.webp"),
    require("../../assets/doodles/ac_4.webp"),
    require("../../assets/doodles/ac_5.webp"),
    require("../../assets/doodles/ac_6.webp"),
    require("../../assets/doodles/ac_7.webp"),
    require("../../assets/doodles/ac_8.webp"),
  ],
];

const FRAME_MS = 170; // the original clips run at ~6 frames a second
const SCENE_MS = 6000;
const MAX_OPACITY = 0.2;

export function AuthBackdrop() {
  const { width, height } = useWindowDimensions();
  const [frame, setFrame] = useState(0);
  const [scene, setScene] = useState(0);
  const fades = useRef(SCENES.map((_, i) => new Animated.Value(i === 0 ? MAX_OPACITY : 0))).current;

  useEffect(() => {
    const f = setInterval(() => setFrame((x) => x + 1), FRAME_MS);
    const s = setInterval(() => setScene((x) => (x + 1) % SCENES.length), SCENE_MS);
    return () => {
      clearInterval(f);
      clearInterval(s);
    };
  }, []);

  useEffect(() => {
    SCENES.forEach((_, i) => {
      Animated.timing(fades[i], { toValue: i === scene ? MAX_OPACITY : 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    });
  }, [scene, fades]);

  // Cover the screen (the frames are portrait, 9:16).
  const w = Math.max(width, (height * 9) / 16);
  const h = (w * 16) / 9;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SCENES.map((frames, i) => (
        <Animated.View key={i} style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", opacity: fades[i] }]}>
          <Image source={frames[frame % frames.length]} style={{ width: w, height: h }} resizeMode="cover" fadeDuration={0} />
        </Animated.View>
      ))}
    </View>
  );
}
