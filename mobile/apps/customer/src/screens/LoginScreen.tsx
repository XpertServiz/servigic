import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../lib/auth";
import { Button, Field } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signIn(phone, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>Servigic</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to post jobs and track bids.</Text>

        <Field label="Phone number" keyboardType="phone-pad" placeholder="03001234567" value={phone} onChangeText={setPhone} />
        <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title="Log In" onPress={handleLogin} loading={loading} />

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={{ color: colors.textMuted }}>
            Don&apos;t have an account?{" "}
            <Text style={{ color: colors.accent, fontWeight: "700" }} onPress={() => navigation.navigate("Signup")}>
              Sign up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { color: colors.accent, fontSize: 22, fontWeight: "800", marginBottom: 32 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12 },
});
