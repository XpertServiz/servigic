import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Button } from "../components/ui";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

export default function AwaitingApprovalScreen({ onRefresh }: { onRefresh: () => Promise<void> }) {
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
      <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Awaiting admin approval</Text>
      </View>
      <Text style={styles.body}>
        Your documents are in review. This usually takes a little while — once approved, you'll start getting job
        alerts and can bid right away.
      </Text>

      <View style={{ width: "100%", marginTop: 24, gap: 10 }}>
        <Button title={checking ? "Checking…" : "Check Status"} onPress={check} loading={checking} />
        <Button title="Log out" variant="danger" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  logo: { width: 72, height: 72, marginBottom: 20 },
  badge: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 16,
  },
  badgeText: { color: colors.danger, fontWeight: "800", fontSize: 13, letterSpacing: 0.4 },
  body: { color: colors.textMuted, textAlign: "center", fontSize: 14, maxWidth: 320, lineHeight: 20 },
});
