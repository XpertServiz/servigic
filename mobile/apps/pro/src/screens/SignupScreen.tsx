import React, { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
import { savePendingDocs } from "../lib/pendingDocs";
import { idDocKind } from "../lib/idDoc";
import { TRADES, MAX_SIGNUP_TRADES } from "../lib/tradeList";
import { SelfieCaptureModal } from "../components/SelfieCaptureModal";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

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
  const [launching, setLaunching] = useState(false);
  // The ID photo and a selfie: uploaded automatically after his first sign-in, and what the face check compares him with.
  const [cnicUri, setCnicUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [photoConsent, setPhotoConsent] = useState(false);

  const [cnicBackUri, setCnicBackUri] = useState<string | null>(null);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [trades, setTrades] = useState<string[]>([]);
  const toggleTrade = (x: string) => setTrades((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : cur.length >= MAX_SIGNUP_TRADES ? cur : [...cur, x]));
  const docName = t(`signup.doc.${idDocKind(phone.country)}` as "signup.doc.id");

  // Front and back of the ID: camera or gallery.
  function pickDoc(side: "front" | "back") {
    const set = side === "front" ? setCnicUri : setCnicBackUri;
    const take = async (gallery: boolean) => {
      setError(null);
      try {
        if (!gallery) {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return setError(t("signup.cameraNeeded"));
        }
        const res = gallery ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 }) : await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
        if (!res.canceled && res.assets[0]) set(res.assets[0].uri);
      } catch {
        setError(t("kyc.uploadFailed"));
      }
    };
    Alert.alert(t(side === "front" ? "signup.idFront" : "signup.idBack", { doc: docName }), undefined, [
      { text: t("signup.takePhoto"), onPress: () => take(false) },
      { text: t("signup.fromGallery"), onPress: () => take(true) },
      { text: t("common.back"), style: "cancel" },
    ]);
  }

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
    if (trades.length === 0) {
      setError(t("signup.tradesSub"));
      return;
    }
    if (!cnicUri || !cnicBackUri || !selfieUri) {
      setError(t("signup.docsSub"));
      return;
    }
    setLoading(true);
    try {
      // Market config (handoff section 11.6): sign up into the market for the user's country. Without market
      // config (older backend / offline) keep the legacy default so nobody is locked out.
      const cfg = await loadMarketConfig(null);
      const city = cfg && !cfg.legacyOpen ? cfg.market?.cities?.[0] : "Karachi";
      const { userId, verified } = await api.register({ role: "PROVIDER", name, phone: phone.e164, email, password, confirmPassword: confirm, ...(city ? { city } : {}), ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}), deviceId: await getDeviceId(), country: phone.country, terms });
      await savePendingDocs({ phone: phone.e164, cnicUri, cnicBackUri, selfieUri, photoConsent, trades }).catch(() => {});
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
      <AuthBackdrop image={design.image} heightFrac={0.4} dim={0.5} />
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

        <Text style={styles.docsTitle}>{t("signup.trades")}</Text>
        <Text style={styles.docsSub}>{t("signup.tradesSub")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {TRADES.map((x) => {
            const on = trades.includes(x);
            return (
              <Pressable key={x} onPress={() => toggleTrade(x)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={{ color: on ? colors.accentForeground : colors.textSecondary, fontSize: 12.5, fontWeight: "700" }}>{t(`trade.${x}` as "trade.PLUMBER")}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.docsTitle}>{t("signup.docsTitle")}</Text>
        <Text style={styles.docsSub}>{t("signup.docsSub")}</Text>
        <DocPick label={t("signup.idFront", { doc: docName })} uri={cnicUri} onPress={() => pickDoc("front")} />
        <DocPick label={t("signup.idBack", { doc: docName })} uri={cnicBackUri} onPress={() => pickDoc("back")} />
        <DocPick label={t("signup.selfieLabel")} uri={selfieUri} onPress={() => setSelfieOpen(true)} />
        <SelfieCaptureModal visible={selfieOpen} onClose={() => setSelfieOpen(false)} onPicked={setSelfieUri} />
        <Pressable onPress={() => setPhotoConsent((v) => !v)} style={styles.consentRow}>
          <View style={[styles.checkbox, photoConsent && styles.checkboxOn]}>{photoConsent && <Icon name="check" size={13} color={colors.accentForeground} />}</View>
          <Text style={styles.consentText}>{t("kyc.consent")}</Text>
        </Pressable>

        <Field label={t("referral.signupLabel")} value={referralCode} onChangeText={(v) => setReferralCode(v.toUpperCase())} autoCapitalize="characters" />

        <AcceptAgreement key={phone.country} role="PROVIDER" country={phone.country} name={name} onChange={setTerms} />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.approval}>
          <Text style={styles.approvalTitle}>{"⏳ " + t("auth.proPendingTitle")}</Text>
          <Text style={styles.approvalBody}>{t("auth.proPendingBody")}</Text>
        </View>
        {launching && <Text style={{ color: colors.accent, fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>{t("pro.launchingNote")}</Text>}
        <Button title={t("auth.createAccount")} onPress={handleSignup} loading={loading} disabled={!name || !phone.text || !email || password.length < 8 || confirm !== password || !terms || trades.length === 0 || !cnicUri || !cnicBackUri || !selfieUri} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function DocPick({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} style={styles.docRow}>
      {uri ? <Image source={{ uri }} style={styles.docThumb} /> : <View style={[styles.docThumb, { backgroundColor: "rgba(255,255,255,0.06)" }]} />}
      <Text style={styles.docLabel}>{label}</Text>
      <Text style={[styles.docStatus, uri && { color: colors.success }]}>{uri ? t("kyc.uploaded") : t("kyc.upload")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13 },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  docsTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 6 },
  docsSub: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, marginBottom: 10 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 10, marginBottom: 10, backgroundColor: "rgba(0,0,0,0.25)" },
  docThumb: { width: 44, height: 44, borderRadius: 10 },
  docLabel: { flex: 1, color: colors.text, fontSize: 13.5, fontWeight: "600" },
  docStatus: { color: colors.accent, fontSize: 12.5, fontWeight: "800" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 18 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentText: { flex: 1, color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
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
