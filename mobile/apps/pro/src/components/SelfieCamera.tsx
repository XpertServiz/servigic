// The selfie camera: front camera, an oval to put the face in, corner brackets and clear instructions. Used for the face check every
// time the app opens, and for the selfie on the sign-up and documents screens.
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse, Path } from "react-native-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { GradientButton } from "./ds";

export function SelfieCamera({ onShot, onBack }: { onShot: (uri: string) => void; onBack: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  async function shoot() {
    if (busy || !cam.current) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.7 });
      // Small enough to upload fast on a weak connection (and under the server limit).
      const small = await ImageManipulator.manipulateAsync(pic.uri, [{ resize: { width: 720 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      onShot(small.uri);
    } catch {
      setBusy(false);
    }
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, paddingTop: insets.top }}>
        <Text style={styles.sub}>{t("face.permission")}</Text>
        <GradientButton title={t("face.openSettings")} onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} style={{ alignSelf: "stretch", marginTop: 16 }} />
        <Text style={[styles.tip, { marginTop: 16 }]} onPress={onBack}>
          {t("common.back")}
        </Text>
      </View>
    );
  }

  const cx = size.w / 2;
  const cy = size.h * 0.4;
  const rx = Math.min(size.w * 0.34, 150);
  const ry = rx * 1.3;
  const br = 26; // corner bracket length
  const corner = (x: number, y: number, dx: number, dy: number) => `M${x},${y + dy * br} L${x},${y} L${x + dx * br},${y}`;
  const l = cx - rx - 18, r = cx + rx + 18, tp = cy - ry - 18, bt = cy + ry + 18;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" />
      {size.w > 0 && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke="#fff" strokeWidth={3} fill="none" />
          <Path d={corner(l, tp, 1, 1) + corner(r, tp, -1, 1) + corner(l, bt, 1, -1) + corner(r, bt, -1, -1)} stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>
      )}
      <Pressable onPress={onBack} hitSlop={14} style={{ position: "absolute", top: insets.top + 12, left: 18 }}>
        <Text style={{ color: "#fff", fontSize: 28 }}>←</Text>
      </Pressable>
      <View style={[styles.framePill, { top: cy + ry + 44 }]}>
        <Text style={{ color: "#fff", fontSize: 14 }}>{t("face.frame")}</Text>
      </View>
      <Text style={styles.centerHint}>{t("selfie.center")}</Text>
      <View style={{ position: "absolute", bottom: insets.bottom + 28, left: 0, right: 0, alignItems: "center" }}>
        <Pressable onPress={shoot} disabled={busy} style={styles.shutterOuter}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  sub: { color: colors.textSecondary, fontSize: 14.5, textAlign: "center", lineHeight: 21, marginBottom: 10 },
  tip: { color: colors.textMuted, fontSize: 12.5, textAlign: "center", marginTop: 14 },
  framePill: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999 },
  centerHint: { position: "absolute", alignSelf: "center", bottom: 140, color: "#fff", fontSize: 12.5, lineHeight: 18, textAlign: "center", paddingHorizontal: 34, textShadowColor: "#000", textShadowRadius: 6 },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
});
