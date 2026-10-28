// "Verify identity": the illustration with the corner brackets, and the six tips for a good selfie. Used before the camera opens
// on the sign-up screen, the documents screen and the face check.
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { GradientButton } from "./ds";

export function SelfieTips() {
  const t = useT();
  return (
    <View style={{ alignSelf: "stretch", alignItems: "center" }}>
      <Image source={require("../../assets/face/avatar.webp")} style={styles.avatar} resizeMode="contain" />
      <View style={{ alignSelf: "stretch", marginBottom: 14 }}>
        <Text style={styles.tipsTitle}>{t("selfie.tips")}</Text>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <View key={n} style={styles.tipRow}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.tipText}>{t(`selfie.tip${n}` as "selfie.tip1")}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SelfieIntro({ onTake, onGallery, onBack }: { onTake: () => void; onGallery?: () => void; onBack: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 22, paddingHorizontal: 22, alignItems: "center" }}>
      <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <Pressable onPress={onBack} hitSlop={14}>
          <Text style={{ color: colors.accent, fontSize: 28 }}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t("selfie.title")}</Text>
        <View style={{ width: 20 }} />
      </View>
      <SelfieTips />
      <Text style={styles.text}>{t("selfie.intro")}</Text>
      <GradientButton title={"📷  " + t("selfie.take")} onPress={onTake} style={{ alignSelf: "stretch" }} />
      {onGallery && (
        <Pressable onPress={onGallery} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 14 }}>{t("selfie.gallery")}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { flex: 1, color: colors.accent, fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: 1, textTransform: "uppercase" },
  avatar: { width: 230, height: 205, marginVertical: 10 },
  text: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 16 },
  tipsTitle: { color: colors.accent, fontSize: 18, fontWeight: "800", marginBottom: 6 },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 3 },
  dot: { color: colors.accent, fontSize: 15 },
  tipText: { flex: 1, color: colors.textSecondary, fontSize: 13.5, lineHeight: 19 },
});
