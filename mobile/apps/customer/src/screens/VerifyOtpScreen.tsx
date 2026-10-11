import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { GlowBackground } from "../components/ds";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOtp">;

export default function VerifyOtpScreen({ route, navigation }: Props) {
  const t = useT();
  const { userId } = route.params;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      await api.verifyOtp(userId, code);
      navigation.replace("Login");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.verifyFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    await api.resendOtp(userId);
    setResent(true);
  }

  return (
    <View style={styles.container}>
      <GlowBackground cy="25%" opacity={0.12} />
      <Text style={styles.title}>{t("auth.verifyTitle")}</Text>
      <Text style={styles.subtitle}>{t("auth.verifySubtitle")}</Text>

      <Field label={t("auth.code")} keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} placeholder="000000" />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title={t("auth.verify")} onPress={handleVerify} loading={loading} disabled={code.length !== 6} />

      <Text style={styles.resend} onPress={handleResend}>
        {resent ? t("auth.codeResent") : t("auth.resendCode")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg, justifyContent: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  error: { color: colors.dangerSoft, marginBottom: 12, fontSize: 13 },
  resend: { color: colors.accent, fontWeight: "700", textAlign: "center", marginTop: 20 },
});
