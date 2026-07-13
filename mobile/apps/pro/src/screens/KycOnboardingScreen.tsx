import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ScrollView, Animated } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as api from "../lib/api";
import { Button } from "../components/ui";
import { colors } from "../lib/theme";

// Same real-trades stock photography as the web landing hero, for visual
// consistency between the marketing site and the app's first real screen.
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

export default function KycOnboardingScreen({ onSubmitted }: { onSubmitted: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const [cnicUrl, setCnicUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [policeCertUrl, setPoliceCertUrl] = useState("");
  const [busy, setBusy] = useState<"cnic" | "selfie" | "police" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setPhotoIndex((i) => (i + 1) % BG_PHOTOS.length);
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, SLOT_MS);
    return () => clearInterval(interval);
  }, [fade]);

  async function pickDoc(kind: "cnic" | "selfie" | "police", setUrl: (url: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setBusy(kind);
    setError(null);
    try {
      const url = await api.uploadFile(asset.uri, asset.fileName ?? "doc.jpg", asset.mimeType ?? "image/jpeg");
      setUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("submit");
    setError(null);
    try {
      await api.updateProviderProfile({
        cnicUrl,
        selfieUrl,
        policeCertUrl: policeCertUrl || undefined,
        agreementAccepted: true,
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(null);
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

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Get verified to start earning</Text>
        <Text style={styles.subtitle}>
          Upload your documents once — our team reviews them, then you start getting job alerts and can bid.
        </Text>

        <DocRow
          label="CNIC"
          done={Boolean(cnicUrl)}
          loading={busy === "cnic"}
          onPress={() => pickDoc("cnic", setCnicUrl)}
        />
        <DocRow
          label="Selfie"
          done={Boolean(selfieUrl)}
          loading={busy === "selfie"}
          onPress={() => pickDoc("selfie", setSelfieUrl)}
        />
        <DocRow
          label="Police Clearance Certificate (optional)"
          done={Boolean(policeCertUrl)}
          loading={busy === "police"}
          onPress={() => pickDoc("police", setPoliceCertUrl)}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ marginTop: 20, width: "100%" }}>
          <Button
            title={busy === "submit" ? "Submitting…" : "Submit for Review"}
            onPress={submit}
            loading={busy === "submit"}
            disabled={!cnicUrl || !selfieUrl}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function DocRow({ label, done, loading, onPress }: { label: string; done: boolean; loading: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={styles.docRow}>
      <Text style={styles.docLabel}>{label}</Text>
      <Text style={[styles.docStatus, done && styles.docStatusDone]}>
        {loading ? "Uploading…" : done ? "Uploaded ✓" : "Upload"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(10,11,15,0.8)" },
  content: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 64, gap: 12 },
  logo: { width: 64, height: 64, marginBottom: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 12, maxWidth: 320 },
  docRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(23,26,34,0.9)",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  docLabel: { color: colors.text, fontSize: 14, fontWeight: "600", flex: 1, paddingRight: 8 },
  docStatus: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  docStatusDone: { color: colors.secondary },
  error: { color: colors.danger, marginTop: 4, textAlign: "center" },
});
