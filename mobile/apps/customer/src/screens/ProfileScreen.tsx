import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui";
import { ProviderAvatar } from "../components/ds";
import { colors, radius } from "../lib/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Account</Text>

      <View style={styles.profileCard}>
        <ProviderAvatar name={user?.name ?? "?"} ratingAvg={5} size={64} />
        <View style={{ marginLeft: 14 }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>{user?.name}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 2 }}>{user?.phone}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Text style={styles.sectionLine}>WhatsApp support · Saved addresses · Payment history</Text>
      </View>

      <View style={{ marginTop: 28 }}>
        <Button title="Log out" variant="danger" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 16 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  section: { marginTop: 20 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  sectionLine: { color: colors.text, fontSize: 14 },
});
