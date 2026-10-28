// Face check every time the Pro app is opened or a pro signs in: a live selfie is matched on the server with his ID card
// photo and profile photo (free, open-source; see src/lib/faceMatch.ts on the server). Until it passes, the app stays behind
// this full-screen window. 3 failed tries wait for an admin. Switched on/off and tuned in Admin > Settings.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Easing, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse, Path } from "react-native-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { faceSession } from "../lib/faceSession";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { GradientButton } from "./ds";

type Step = "idle" | "intro" | "camera" | "verifying" | "done" | "fail" | "locked";
const AWAY_BEFORE_ASKING_AGAIN_MS = 6 * 60 * 60 * 1000;

export function FaceGate() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = (user as { id?: string } | null)?.id ?? null;
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const wentAway = useRef<number | null>(null);

  const check = useCallback(async () => {
    setBusy(true);
    try {
      const s = await api.getFaceStatus();
      if (!s.required) setStep("idle");
      else if (s.locked) setStep("locked");
      else {
        setLeft(s.attemptsLeft ?? null);
        setStep("intro");
      }
    } catch {
      // Offline or an old server: the server still blocks going online / bidding without a recent pass.
      setStep("idle");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      faceSession.reset();
      setStep("idle");
      return;
    }
    if (!faceSession.isPassed()) check();
  }, [userId, check]);

  // Documents were just uploaded (sign-up or the documents screen): ask the server again.
  useEffect(
    () =>
      faceSession.onRecheck(() => {
        faceSession.reset();
        if (userId) check();
      }),
    [userId, check],
  );

  // Back after a long time in the background: ask again.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") wentAway.current = Date.now();
      else if (s === "active" && wentAway.current && Date.now() - wentAway.current > AWAY_BEFORE_ASKING_AGAIN_MS) {
        wentAway.current = null;
        faceSession.reset();
        if (userId) check();
      }
    });
    return () => sub.remove();
  }, [userId, check]);

  async function onShot(uri: string) {
    setStep("verifying");
    try {
      const r = await api.submitFaceCheck(uri);
      if (r.ok) {
        faceSession.pass();
        setStep("done");
        return;
      }
      setLeft(r.attemptsLeft ?? null);
      if (r.code === "REVIEW") return setStep("locked");
      setMessage(r.code === "NO_FACE" ? t("face.noFace") : t("face.noMatch"));
      setStep("fail");
    } catch (e) {
      setLeft(null);
      setMessage(e instanceof Error && e.message ? t("face.unavailable") : t("face.unavailable"));
      setStep("fail");
    }
  }

  if (step === "idle") return null;
  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {step === "camera" ? (
          <SelfieCamera onShot={onShot} onBack={() => setStep("intro")} />
        ) : (
          <View style={{ flex: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" }}>
            <Text style={styles.brand}>SERVIGIC PRO</Text>

            {step === "intro" && (
              <>
                <Text style={styles.title}>{t("face.title")}</Text>
                <Text style={styles.sub}>{t("face.sub")}</Text>
                <Image source={require("../../assets/face/intro.webp")} style={styles.introImg} resizeMode="contain" />
                {left != null && left < 3 && <Text style={styles.warn}>{t("face.tries", { n: left })}</Text>}
                <GradientButton title={"📷  " + t("face.take")} onPress={() => setStep("camera")} style={{ alignSelf: "stretch" }} />
                <Text style={styles.tip}>{t("face.tip")}</Text>
                <Text style={[styles.tip, { marginTop: 8, fontSize: 11.5 }]}>{t("face.consent")}</Text>
              </>
            )}

            {step === "verifying" && <Verifying />}

            {step === "done" && (
              <>
                <Image source={require("../../assets/face/verified.webp")} style={{ width: 240, height: 185 }} resizeMode="contain" />
                <Text style={styles.title}>{t("face.okTitle")}</Text>
                <Text style={styles.sub}>{t("face.okSub")}</Text>
                <GradientButton title={t("face.continue")} onPress={() => setStep("idle")} style={{ alignSelf: "stretch", marginTop: 18 }} />
              </>
            )}

            {step === "fail" && (
              <>
                <Text style={styles.title}>{t("face.failTitle")}</Text>
                <Text style={styles.sub}>{message}</Text>
                {left != null && <Text style={styles.warn}>{t("face.tries", { n: left })}</Text>}
                <GradientButton title={t("face.again")} onPress={() => setStep("camera")} style={{ alignSelf: "stretch", marginTop: 18 }} />
              </>
            )}

            {step === "locked" && (
              <>
                <Text style={styles.title}>{t("face.lockedTitle")}</Text>
                <Text style={styles.sub}>{t("face.review")}</Text>
                <GradientButton title={t("face.recheck")} onPress={check} disabled={busy} style={{ alignSelf: "stretch", marginTop: 18 }} />
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

function Verifying() {
  const t = useT();
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(slide, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [slide]);
  return (
    <>
      <Image source={require("../../assets/face/verifying.webp")} style={{ width: 230, height: 194 }} resizeMode="contain" />
      <Text style={styles.title}>{t("face.verifyingTitle")}</Text>
      <Text style={styles.sub}>{t("face.verifyingSub")}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { left: slide.interpolate({ inputRange: [0, 1], outputRange: ["-35%", "100%"] }) }]} />
      </View>
    </>
  );
}

function SelfieCamera({ onShot, onBack }: { onShot: (uri: string) => void; onBack: () => void }) {
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
      <View style={{ position: "absolute", bottom: insets.bottom + 28, left: 0, right: 0, alignItems: "center" }}>
        <Pressable onPress={shoot} disabled={busy} style={styles.shutterOuter}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { color: colors.accent, fontSize: 14, fontWeight: "800", letterSpacing: 1.6, marginBottom: 18 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 8, marginTop: 6 },
  sub: { color: colors.textSecondary, fontSize: 14.5, textAlign: "center", lineHeight: 21, marginBottom: 10 },
  tip: { color: colors.textMuted, fontSize: 12.5, textAlign: "center", marginTop: 14 },
  warn: { color: colors.dangerSoft, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  introImg: { width: "78%", height: 260, marginVertical: 14, borderRadius: 18 },
  track: { alignSelf: "stretch", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden", marginTop: 26 },
  bar: { position: "absolute", top: 0, bottom: 0, width: "35%", borderRadius: 3, backgroundColor: colors.accent },
  framePill: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999 },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
});
