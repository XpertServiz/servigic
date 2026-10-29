import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field, PhoneField, usePhoneInput } from "../components/ui";
import { Icon } from "../components/Icon";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { loadMarketConfig } from "../lib/market";
import { getDeviceId } from "../lib/device";
import { GlowBackground } from "../components/ds";
import { AuthBackdrop } from "../components/AuthBackdrop";
import { useAuthDesign } from "../lib/authDesigns";
import { authErrorMessage } from "../lib/authErrors";
import { AcceptAgreement, type TermsAcceptance } from "../components/AcceptAgreement";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Create account (D3C-CreateAccount): full name, phone, password.
export default function SignupScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const phone = usePhoneInput();
  const design = useAuthDesign();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The e-signed Customer Terms / Pro Agreement of the phone number's country; no account without it.
  const [terms, setTerms] = useState<TermsAcceptance | null>(null);

  async function handleSignup() {
    setError(null);
    phone.setTouched(true);
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("auth.errEmailInvalid"));
      return;
    }
    if (!phone.e164) {
      setError(t("phone.error", { example: phone.example.international }));
      return;
    }
    if (!terms) {
      setError(t("legal.required"));
      return;
    }
    setLoading(true);
    try {
      // Market config (handoff section 11.6): sign up into the market for the user's country. Without market
      // config (older backend / offline) keep the legacy default so nobody is locked out.
      const cfg = await loadMarketConfig(null);
      const city = cfg && !cfg.legacyOpen ? cfg.market?.cities?.[0] : "Karachi";
      const { userId, verified } = await api.register({ role: "CUSTOMER", name, phone: phone.e164, email: email.trim(), password, confirmPassword: confirm, ...(city ? { city } : {}), ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}), deviceId: await getDeviceId(), country: phone.country, terms });
      // Second role on a number that is already verified: nothing to confirm, just sign in.
      if (verified) {
        Alert.alert(t("auth.linkedDone"));
        navigation.replace("Login");
        return;
      }
      navigation.replace("VerifyOtp", { userId });
    } catch (e) {
      setError(authErrorMessage(e, t, "CUSTOMER"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GlowBackground cx="30%" cy="15%" r="70%" opacity={0.12} />
      <AuthBackdrop image={design.image} heightFrac={0.4} dim={0.5} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("auth.createAccountHeader")}</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 22 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>{t("auth.createYourAccount")}</Text>
        <Text style={styles.subtitle}>{t("auth.signupSubtitle")}</Text>

        <Field label={t("auth.fullName")} value={name} onChangeText={setName} />
        <PhoneField phone={phone} />
        <Field label={t("auth.email")} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@example.com" value={email} onChangeText={setEmail} helper={t("auth.emailForCode")} />
        <Field label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
        <Field label={t("auth.confirmPassword")} secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="••••••••" error={confirm && confirm !== password ? t("auth.passwordMismatch") : null} />

        <Field label={t("referral.signupLabel")} value={referralCode} onChangeText={(v) => setReferralCode(v.toUpperCase())} autoCapitalize="characters" />

        <AcceptAgreement key={phone.country} role="CUSTOMER" country={phone.country} name={name} onChange={setTerms} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title={t("auth.createAccount")} onPress={handleSignup} loading={loading} disabled={!name || !phone.text || !EMAIL_RE.test(email.trim()) || password.length < 8 || confirm !== password || !terms} />
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
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 26 },
  error: { color: colors.dangerSoft, marginBottom: 12, fontSize: 13 },
});
