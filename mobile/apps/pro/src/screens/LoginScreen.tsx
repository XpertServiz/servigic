import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../lib/auth";
import { Button, Field, PhoneField, usePhoneInput } from "../components/ui";
import { GlowBackground } from "../components/ds";
import { AuthBackdrop } from "../components/AuthBackdrop";
import { authErrorMessage } from "../lib/authErrors";
import { APP_ROLE } from "../lib/appRole";
import { SplashLogo } from "../components/SplashLogo";
import { HeaderActions } from "../components/HeaderActions";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const phone = usePhoneInput();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    phone.setTouched(true);
    if (!phone.e164) {
      setError(t("phone.error", { example: phone.example.international }));
      return;
    }
    setLoading(true);
    try {
      await signIn(phone.e164, password);
    } catch (e) {
      setError(authErrorMessage(e, t, APP_ROLE, "auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <GlowBackground cx="30%" cy="15%" r="70%" opacity={0.14} />
      <AuthBackdrop country={phone.country} />
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <HeaderActions showBell={false} />
      </View>

      {/* Edge-to-edge: Android no longer resizes the window for the keyboard, so pad for it on both platforms. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 64, paddingBottom: 32 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* The splash-screen logo: the amber "S" with the red dot travelling around it. */}
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <SplashLogo size={92} />
          </View>
          <Text style={styles.brand}>SERVIGIC PRO</Text>
          <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
          <Text style={styles.subtitle}>{t("auth.proTagline")}</Text>

          <PhoneField phone={phone} />
          <Field label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13, textAlign: "right", marginTop: -8, marginBottom: 16 }} onPress={() => navigation.navigate("ForgotPassword")}>
            {t("auth.forgotPassword")}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title={t("auth.logIn")} onPress={handleLogin} loading={loading} disabled={!phone.text || !password} />

          <View style={{ marginTop: 22, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {t("auth.newToServigic")}{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }} onPress={() => navigation.navigate("Signup")}>
                {t("auth.becomePro")}
              </Text>
            </Text>
          </View>

          <View style={styles.banner}>
            <View style={{ flex: 1, paddingEnd: 8 }}>
              <Text style={styles.bannerTitle}>{t("brand.realPeople")}</Text>
              <Text style={styles.bannerSub}>{t("brand.verifiedPros")}</Text>
            </View>
            <Image source={require("../../assets/face/people.webp")} style={styles.bannerImg} resizeMode="cover" />
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
  banner: { marginTop: 26, flexDirection: "row", alignItems: "center", backgroundColor: colors.bgElevated, borderRadius: 18, borderWidth: 1, borderColor: "rgba(245,166,35,0.2)", overflow: "hidden", paddingStart: 16, minHeight: 120 },
  bannerTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  bannerSub: { color: colors.textMuted, fontSize: 12.5 },
  bannerImg: { width: 120, height: 120 },
});
