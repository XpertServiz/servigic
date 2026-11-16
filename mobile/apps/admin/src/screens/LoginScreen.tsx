// Admin sign-in, in the same style as the Customer and Pro apps: one photo (the Quaid-e-Azam Mausoleum, Karachi), the amber "S" with
// the red dot travelling around it, gold-bordered fields, and the Pakistan skyline. The admin app is used by the team in Pakistan only,
// so there is no country detection or language switch here.
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { AuthBackdrop } from "../components/AuthBackdrop";
import { SplashLogo } from "../components/SplashLogo";

const GOLD_BORDER = "rgba(255,176,32,0.5)";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(phone.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !phone || !password;
  return (
    <View style={styles.root}>
      <AuthBackdrop image={require("../../assets/auth/hero/PK-karachi.webp")} heightFrac={0.5} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 64, paddingBottom: 28 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <SplashLogo size={92} />
          </View>
          <Text style={styles.brand}>SERVIGIC ADMIN</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Approve payments and manage the platform from anywhere.</Text>

          <Text style={styles.label}>Phone number</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="03xxxxxxxxx" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" autoCapitalize="none" style={styles.input} />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <View>
            <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} style={[styles.input, { paddingRight: 64 }]} />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={submit} disabled={disabled} style={[styles.button, disabled && { opacity: 0.6 }]}>
            <Text style={styles.buttonText}>{busy ? "Signing in…" : "Log In"}</Text>
          </Pressable>

          <View style={styles.badges}>
            {["Safe", "Fast", "Reliable"].map((b) => (
              <View key={b} style={styles.badge}>
                <View style={styles.badgeDot}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: "800" }}>✓</Text></View>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
          <Image source={require("../../assets/auth/hero/skyline_pk.png")} style={styles.sky} resizeMode="contain" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 26 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: "800", letterSpacing: 1.3, marginBottom: 10, textAlign: "center" },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 18 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: { width: "100%", borderWidth: 1, borderColor: GOLD_BORDER, backgroundColor: colors.bgElevated, borderRadius: radius.button, paddingVertical: 13, paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, textAlign: "center", marginTop: 12 },
  button: { width: "100%", backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: colors.accentForeground, fontWeight: "800", fontSize: 16 },
  badges: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 18 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgeDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: GOLD_BORDER, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  sky: { width: "100%", height: 80, marginTop: 14, opacity: 0.9 },
});
