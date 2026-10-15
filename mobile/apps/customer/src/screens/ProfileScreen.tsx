// Customer account — not part of the design round, so it is built from the
// redesign tokens and the same row pattern as the Pro account screen.
import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui";
import { ProviderAvatar } from "../components/ds";
import { HeaderActions } from "../components/HeaderActions";
import { Icon } from "../components/Icon";
import { colors } from "../lib/theme";
import { LANGUAGES, useI18n } from "../lib/i18n";
import { navigateRoot } from "../navigation/ref";
import { ReferralCard } from "../components/ReferralCard";

function requestAccountDeletion(phone?: string) {
  const body = `Registered phone number/email:\n${phone ?? ""}\nAccount type (Customer/Pro): Customer\n`;
  Linking.openURL(
    `mailto:xpertserviz@gmail.com?subject=${encodeURIComponent("Servigic Account Deletion Request")}&body=${encodeURIComponent(body)}`
  );
}

export default function ProfileScreen() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const currentLanguage = LANGUAGES.find((l) => l.code === lang);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}>
      <View style={styles.titleRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
          <ProviderAvatar name={user?.name ?? "?"} size={62} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 19 }}>{user?.name}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 3, fontSize: 12 }}>{user?.phone}</Text>
          </View>
        </View>
        <HeaderActions />
      </View>

      <ReferralCard />

      <Pressable onPress={() => navigateRoot("Language")} style={styles.row}>
        <Icon name="globe" size={18} />
        <Text style={styles.rowText}>{t("lang.title")}</Text>
        <Text style={styles.rowValue}>{currentLanguage?.native}</Text>
        <Icon name="chevron-right" size={14} color={colors.textFaint} />
      </Pressable>

      <Pressable onPress={() => navigateRoot("Notifications")} style={styles.row}>
        <Icon name="bell" size={18} />
        <Text style={styles.rowText}>{t("notifications.title")}</Text>
        <Icon name="chevron-right" size={14} color={colors.textFaint} />
      </Pressable>

      <Text style={styles.sectionTitle}>{t("account.legal")}</Text>
      <Pressable onPress={() => Linking.openURL("https://www.servigic.com/privacy-policy.html")}>
        <Text style={styles.linkLine}>{t("account.privacy")}</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL("https://www.servigic.com/delete-account.html")}>
        <Text style={styles.linkLine}>{t("account.deleteHow")}</Text>
      </Pressable>

      <View style={{ marginTop: 28, gap: 12 }}>
        <Button title={t("account.logOut")} variant="danger" onPress={signOut} />
        <Button title={t("account.deleteAccount")} variant="ghost" onPress={() => requestAccountDeletion(user?.phone)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginTop: 12,
  },
  rowText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  rowValue: { color: colors.textMuted, fontSize: 13 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 26, marginBottom: 6 },
  linkLine: { color: colors.text, fontSize: 14, paddingVertical: 8 },
});
