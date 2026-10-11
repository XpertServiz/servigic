import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../components/ui";
import { GlowBackground } from "../components/ds";
import { LogoMark3D } from "../components/LogoMark";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

export default function AwaitingApprovalScreen({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const t = useT();
  const { signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.container}>
      <GlowBackground cy="30%" opacity={0.14} />
      <LogoMark3D size={84} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t("approval.badge")}</Text>
      </View>
      <Text style={styles.body}>{t("approval.body")}</Text>

      <View style={{ width: "100%", marginTop: 24, gap: 10 }}>
        <Button title={checking ? t("approval.checking") : t("approval.check")} onPress={check} loading={checking} />
        <Button title={t("account.logOut")} variant="danger" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  badge: {
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentTint,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 22,
    marginBottom: 16,
  },
  badgeText: { color: colors.accent, fontWeight: "800", fontSize: 13, letterSpacing: 0.4 },
  body: { color: colors.textMuted, textAlign: "center", fontSize: 14, maxWidth: 320, lineHeight: 21 },
});
