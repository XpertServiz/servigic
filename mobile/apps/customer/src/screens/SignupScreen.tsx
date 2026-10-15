import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field, PhoneField, usePhoneInput } from "../components/ui";
import { Icon } from "../components/Icon";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { loadMarketConfig } from "../lib/market";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

// Create account (D3C-CreateAccount): full name, phone, password.
export default function SignupScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const phone = usePhoneInput();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);
    phone.setTouched(true);
    if (!phone.e164) {
      setError(t("phone.error", { example: phone.example.international }));
      return;
    }
    setLoading(true);
    try {
      // Market config (handoff section 11.6): sign up into the market for the user's country. Without market
      // config (older backend / offline) keep the legacy default so nobody is locked out.
      const cfg = await loadMarketConfig(null);
      const city = cfg && !cfg.legacyOpen ? cfg.market?.cities?.[0] : "Karachi";
      const { userId } = await api.register({ role: "CUSTOMER", name, phone: phone.e164, password, ...(city ? { city } : {}) });
      navigation.replace("VerifyOtp", { userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.signupFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("auth.createAccountHeader")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("auth.createYourAccount")}</Text>
        <Text style={styles.subtitle}>{t("auth.signupSubtitle")}</Text>

        <Field label={t("auth.fullName")} value={name} onChangeText={setName} />
        <PhoneField phone={phone} />
        <Field label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title={t("auth.createAccount")} onPress={handleSignup} loading={loading} disabled={!name || !phone.text || password.length < 8} />
        <Text style={styles.legal}>{t("auth.legal")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  container: { flexGrow: 1, padding: 22, paddingTop: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 26 },
  error: { color: colors.dangerSoft, marginBottom: 12, fontSize: 13 },
  legal: { marginTop: 18, fontSize: 11, color: colors.textFainter, lineHeight: 16 },
});
