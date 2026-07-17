import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui";
import { ProviderAvatar } from "../components/ds";
import { colors, radius } from "../lib/theme";

function requestAccountDeletion(phone?: string) {
  const body = `Registered phone number/email:\n${phone ?? ""}\nAccount type (Customer/Pro): Customer\n`;
  Linking.openURL(
    `mailto:xpertserviz@gmail.com?subject=${encodeURIComponent("Servigic Account Deletion Request")}&body=${encodeURIComponent(body)}`
  );
}

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal & Support</Text>
        <Pressable onPress={() => Linking.openURL("https://www.servigic.com/privacy-policy.html")}>
          <Text style={styles.linkLine}>Privacy Policy</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL("https://www.servigic.com/delete-account.html")}>
          <Text style={styles.linkLine}>Delete Account — How it works</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 28 }}>
        <Button title="Log out" variant="danger" onPress={signOut} />
      </View>

      <View style={{ marginTop: 12, marginBottom: 24 }}>
        <Button title="Delete My Account" variant="danger" onPress={() => requestAccountDeletion(user?.phone)} />
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
  linkLine: { color: colors.text, fontSize: 14, paddingVertical: 8 },
});
