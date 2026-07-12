import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyOtp">;

export default function VerifyOtpScreen({ route, navigation }: Props) {
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
      setError(e instanceof Error ? e.message : "Verification failed");
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
      <Text style={styles.title}>Verify your phone</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code we sent you.</Text>

      <Field label="Code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} placeholder="000000" />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title="Verify" onPress={handleVerify} loading={loading} disabled={code.length !== 6} />

      <Text style={styles.resend} onPress={handleResend}>
        {resent ? "Code resent ✓" : "Resend code"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg, justifyContent: "center" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12 },
  resend: { color: colors.accent, fontWeight: "700", textAlign: "center", marginTop: 20 },
});
