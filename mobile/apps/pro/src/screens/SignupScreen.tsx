import React, { useEffect, useState } from "react";
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
import { authErrorMessage } from "../lib/authErrors";
import { AcceptAgreement, type TermsAcceptance } from "../components/AcceptAgreement";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const phone = usePhoneInput();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The e-signed Customer Terms / Pro Agreement of the phone number's country; no account without it.
  const [terms, setTerms] = useState<TermsAcceptance | null>(null);
  const [launching, setLaunching] = useState(false);

  // Honest expectation-setting: if the market is not fully live yet, say so before the pro invests time.
  useEffect(() => {
    loadMarketConfig(null).then((cfg) => setLaunching(Boolean(cfg && !cfg.legacyOpen && (!cfg.market || cfg.market.status !== "LIVE"))));
  }, []);

  async function handleSignup() {
    setError(null);
    phone.setTouched(true);
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
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
      const { userId, verified } = await api.register({ role: "PROVIDER", name, phone: phone.e164, email, password, confirmPassword: confirm, ...(city ? { city } : {}), ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}), deviceId: await getDeviceId(), country: phone.country, terms });
      // Second role on a number that is already verified: nothing to confirm, just sign in.
      if (verified) {
        Alert.alert(t("auth.linkedDone"));
        navigation.replace("Login");
        return;
      }
      navigation.replace("VerifyOtp", { userId });
    } catch (e) {
      setError(authErrorMessage(e, t, "PROVIDER"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GlowBackground cx="30%" cy="15%" r="70%" opacity={0.12} />
      <AuthBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("auth.becomePro")}</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 22 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>{t("auth.proSignupTitle")}</Text>
        <Text style={styles.subtitle}>{t("auth.proSignupSubtitle")}</Text>

        <Field label={t("auth.fullName")} value={name} onChangeText={setName} />
        <PhoneField phone={phone} />
        <Field
          label={t("auth.email")}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
        />
        <Field label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
        <Field label={t("auth.confirmPassword")} secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="••••••••" error={confirm && confirm !== password ? t("auth.passwordMismatch") : null} />

        <Field label={t("referral.signupLabel")} value={referralCode} onChangeText={(v) => setReferralCode(v.toUpperCase())} autoCapitalize="characters" />

        <AcceptAgreement key={phone.country} role="PROVIDER" country={phone.country} name={name} onChange={setTerms} />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.approval}>
          <Text style={styles.approvalTitle}>{"⏳ " + t("auth.proPendingTitle")}</Text>
          <Text style={styles.approvalBody}>{t("auth.proPendingBody")}</Text>
        </View>
        {launching && <Text style={{ color: colors.accent, fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>{t("pro.launchingNote")}</Text>}
        <Button title={t("auth.createAccount")} onPress={handleSignup} loading={loading} disabled={!name || !phone.text || !email || password.length < 8 || confirm !== password || !terms} />
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
  approval: { backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14, padding: 13, marginBottom: 14 },
  approvalTitle: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  approvalBody: { color: colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
});
