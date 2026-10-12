// Shown to a Pro whose documents are in but not yet approved, instead of a blank
// pending screen. They can browse and build their profile meanwhile; bidding
// stays locked until a person has checked their documents.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

export function VerificationNotice() {
  const t = useT();
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t("verify.pendingTitle")}</Text>
      <Text style={styles.body}>{t("verify.pendingBody")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14, padding: 13 },
  title: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  body: { color: colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
});
