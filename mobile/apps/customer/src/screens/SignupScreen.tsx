import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);
    setLoading(true);
    try {
      const { userId } = await api.register({ role: "CUSTOMER", name, phone, email, password, city: "Karachi" });
      navigation.replace("VerifyOtp", { userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Post jobs and get bids from verified pros.</Text>

      <Field label="Full name" value={name} onChangeText={setName} />
      <Field label="Phone number" keyboardType="phone-pad" placeholder="03001234567" value={phone} onChangeText={setPhone} />
      <Field
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
      />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title="Create Account" onPress={handleSignup} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12 },
});
