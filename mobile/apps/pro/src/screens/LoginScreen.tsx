import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../lib/auth";
import { Button, Field, PhoneField } from "../components/ui";
import { GlowBackground } from "../components/ds";
import { HeaderActions } from "../components/HeaderActions";
import { colors } from "../lib/theme";
import { isValidPhone, normalizePhone } from "../lib/phone";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      setError(t("phone.error", { example: "03076234578" }));
      return;
    }
    setLoading(true);
    try {
      await signIn(normalized, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <GlowBackground cx="30%" cy="15%" r="70%" opacity={0.14} />
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <HeaderActions showBell={false} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>SERVIGIC PRO</Text>
          <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
          <Text style={styles.subtitle}>{t("auth.proTagline")}</Text>

          <PhoneField value={phone} onChangeText={setPhone} />
          <Field label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title={t("auth.logIn")} onPress={handleLogin} loading={loading} disabled={!phone || !password} />

          <View style={{ marginTop: 22, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {t("auth.newToServigic")}{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }} onPress={() => navigation.navigate("Signup")}>
                {t("auth.becomePro")}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: "absolute", right: 18, zIndex: 5 },
  container: { flexGrow: 1, justifyContent: "flex-end", padding: 26, paddingBottom: 40 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: "800", letterSpacing: 1.3, marginBottom: 10 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 26 },
  error: { color: colors.dangerSoft, marginBottom: 12, fontSize: 13 },
});
