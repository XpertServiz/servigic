import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../lib/auth";
import { Button, Field } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

// Same real-trades stock photography as the web landing hero and the KYC
// screen, for visual consistency across the whole Pro app.
const BG_PHOTOS = [
  "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/9875418/pexels-photo-9875418.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/5463581/pexels-photo-5463581.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/33531830/pexels-photo-33531830.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/8817851/pexels-photo-8817851.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/7218579/pexels-photo-7218579.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/6196566/pexels-photo-6196566.jpeg?auto=compress&cs=tinysrgb&w=800",
];
const SLOT_MS = 4500;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setPhotoIndex((i) => (i + 1) % BG_PHOTOS.length);
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, SLOT_MS);
    return () => clearInterval(interval);
  }, [fade]);

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.Image
        source={{ uri: BG_PHOTOS[photoIndex] }}
        style={[StyleSheet.absoluteFill, { opacity: fade }]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.brand}>Servigic Pro</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Go online, bid on jobs, get paid.</Text>

          <Field label="Phone number" keyboardType="phone-pad" placeholder="03001234567" value={phone} onChangeText={setPhone} />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title="Log In" onPress={handleLogin} loading={loading} />

          <View style={{ marginTop: 24, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted }}>
              New to Servigic?{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }} onPress={() => navigation.navigate("Signup")}>
                Become a Pro
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(10,11,15,0.82)" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { color: colors.accent, fontSize: 22, fontWeight: "800", marginBottom: 32 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12 },
});
