import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, KeyboardAvoidingView, Platform } from "react-native";
import { colors, radius } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function LoginScreen() {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Servigic Admin</Text>
      <Text style={styles.subtitle}>Approve payments and manage the platform from anywhere.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="03xxxxxxxxx"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { paddingRight: 64 }]}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
          >
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>{showPassword ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={submit} disabled={busy || !phone || !password} style={[styles.button, (busy || !phone || !password) && styles.buttonDisabled]}>
        <Text style={styles.buttonText}>{busy ? "Signing in…" : "Sign In"}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  logo: { width: 72, height: 72, marginBottom: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", maxWidth: 300, marginBottom: 16 },
  field: { width: "100%" },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  button: {
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.accentForeground, fontWeight: "800", fontSize: 15 },
});
