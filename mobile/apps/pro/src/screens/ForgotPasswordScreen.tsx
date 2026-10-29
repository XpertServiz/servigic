// Forgot password: the phone gets a 6-digit code (WhatsApp / SMS / email), then the code and the new password (typed twice)
// are sent together. Shared verbatim by apps/customer and apps/pro.
import React, { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as api from "../lib/api";
import { Button, Field, PhoneField, usePhoneInput } from "../components/ui";
import { GlowBackground } from "../components/ds";
import { AuthBackdrop } from "../components/AuthBackdrop";
import { useAuthDesign } from "../lib/authDesigns";
import { Icon } from "../components/Icon";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { authErrorMessage } from "../lib/authErrors";
import { APP_ROLE } from "../lib/appRole";

type Props = NativeStackScreenProps<{ ForgotPassword: undefined; Login: undefined }, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const phone = usePhoneInput();
  const design = useAuthDesign();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setError(null);
    phone.setTouched(true);
    if (!phone.e164) {
      setError(t("phone.error", { example: phone.example.international }));
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(phone.e164);
      setInfo(t("auth.codeSent"));
      setStep("code");
    } catch (e) {
      setError(authErrorMessage(e, t, APP_ROLE));
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setError(null);
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({ phone: phone.e164 as string, code, password, confirmPassword: confirm });
      navigation.replace("Login");
    } catch (e) {
      setError(authErrorMessage(e, t, APP_ROLE));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GlowBackground cx="30%" cy="15%" r="70%" opacity={0.14} />
      <AuthBackdrop image={design.image} heightFrac={0.4} dim={0.5} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("auth.forgotTitle")}</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 22 + insets.bottom }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={styles.subtitle}>{t("auth.forgotSub")}</Text>
          {step === "phone" ? (
            <>
              <PhoneField phone={phone} />
              {error && <Text style={styles.error}>{error}</Text>}
              <Button title={t("auth.sendCode")} onPress={send} loading={loading} disabled={!phone.text} />
            </>
          ) : (
            <>
              {info && <Text style={styles.info}>{info}</Text>}
              <Field label={t("auth.codeLabel")} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="000000" />
              <Field label={t("auth.newPassword")} secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
              <Field label={t("auth.confirmPassword")} secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="••••••••" error={confirm && confirm !== password ? t("auth.passwordMismatch") : null} />
              {error && <Text style={styles.error}>{error}</Text>}
              <Button title={t("auth.resetPassword")} onPress={reset} loading={loading} disabled={code.length !== 6 || password.length < 8 || confirm.length < 8} />
            </>
          )}
          <Text style={styles.back2} onPress={() => navigation.navigate("Login")}>
            {t("auth.backToLogin")}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  container: { flexGrow: 1, padding: 22, paddingTop: 10 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 22, lineHeight: 20 },
  error: { color: colors.dangerSoft, marginBottom: 12, fontSize: 13 },
  info: { color: colors.secondary, marginBottom: 12, fontSize: 13 },
  back2: { color: colors.accent, fontWeight: "700", fontSize: 14, textAlign: "center", marginTop: 22 },
});
