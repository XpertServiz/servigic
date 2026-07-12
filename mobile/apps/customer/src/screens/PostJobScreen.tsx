import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field, Card } from "../components/ui";
import { colors } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PostJob">;
type Category = Awaited<ReturnType<typeof api.getCategories>>["categories"][number];

const URGENCY_OPTIONS = [
  { value: "EMERGENCY", label: "🚨 Emergency" },
  { value: "TODAY", label: "Today" },
  { value: "SCHEDULED", label: "Schedule" },
] as const;

export default function PostJobScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<(typeof URGENCY_OPTIONS)[number]["value"]>("TODAY");
  const [areaLabel, setAreaLabel] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [coords, setCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories().then(({ categories: fetched }) => {
      setCategories(fetched);
      if (fetched[0]) setCategoryId(fetched[0].id);
    });
  }, []);

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      const url = await api.uploadFile(asset.uri, asset.fileName ?? "photo.jpg", asset.mimeType ?? "image/jpeg");
      setPhotos((p) => [...p, url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { job } = await api.createJob({
        categoryId,
        title,
        description,
        photos,
        urgency,
        city: "Karachi",
        areaLabel,
        exactAddress,
        lat: coords.lat,
        lng: coords.lng,
      });
      navigation.replace("JobDetail", { jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.rowWrap}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[styles.chip, categoryId === c.id && styles.chipActive]}
          >
            <Text style={{ color: categoryId === c.id ? colors.accent : colors.textMuted }}>
              {c.icon} {c.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field label="Job title" placeholder="e.g. AC not cooling" value={title} onChangeText={setTitle} />
      <Field label="Description" multiline numberOfLines={4} value={description} onChangeText={setDescription} />

      <Text style={styles.label}>Urgency</Text>
      <View style={styles.rowWrap}>
        {URGENCY_OPTIONS.map((o) => (
          <Pressable key={o.value} onPress={() => setUrgency(o.value)} style={[styles.chip, urgency === o.value && styles.chipActive]}>
            <Text style={{ color: urgency === o.value ? colors.accent : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Area" placeholder="e.g. Gulshan-e-Iqbal" value={areaLabel} onChangeText={setAreaLabel} />
      <Field label="Exact address (hidden until paid)" value={exactAddress} onChangeText={setExactAddress} />
      <Pressable onPress={useMyLocation} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.accent, fontWeight: "700" }}>📍 Use my current location</Text>
      </Pressable>

      <Text style={styles.label}>Photos</Text>
      <View style={styles.rowWrap}>
        {photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 8 }} />
        ))}
        <Pressable onPress={pickPhoto} style={styles.photoAdd}>
          <Text style={{ color: colors.textMuted, fontSize: 24 }}>+</Text>
        </Pressable>
      </View>

      {error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}

      <Card style={{ marginTop: 8, marginBottom: 24 }}>
        <Button
          title={submitting ? "Posting…" : "Post Job — Get Bids"}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!title || !description || !areaLabel || !exactAddress}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { borderColor: colors.accent, backgroundColor: "rgba(255,176,32,0.1)" },
  photoAdd: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});
