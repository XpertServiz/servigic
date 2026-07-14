import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Button, Field } from "../components/ui";
import { Chip, SegmentedControl, SheetCard } from "../components/ds";
import { colors, radius } from "../lib/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "PostJob">;
type Category = Awaited<ReturnType<typeof api.getCategories>>["categories"][number];

const URGENCY_OPTIONS = [
  { value: "EMERGENCY" as const, label: "⚡ Emergency" },
  { value: "TODAY" as const, label: "Today" },
  { value: "SCHEDULED" as const, label: "Schedule" },
];

export default function PostJobScreen({ navigation, route }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(route.params?.categoryId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<(typeof URGENCY_OPTIONS)[number]["value"]>(
    route.params?.urgency ?? "TODAY"
  );
  const [areaLabel, setAreaLabel] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [coords, setCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories().then(({ categories: fetched }) => {
      setCategories(fetched);
      if (!route.params?.categoryId && fetched[0]) setCategoryId(fetched[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    setLocating(true);
    try {
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          const formatted = [place.streetNumber, place.street, place.district ?? place.subregion, place.city]
            .filter(Boolean)
            .join(", ");
          if (formatted) setExactAddress(formatted);
          if (!areaLabel && (place.district || place.subregion)) setAreaLabel(place.district ?? place.subregion ?? "");
        }
      } catch {
        // Reverse geocoding is best-effort — coords are already set above,
        // so the job can still be posted even if we can't produce a label.
      }
    } finally {
      setLocating(false);
    }
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ height: 12 }} />
      <SheetCard style={{ flex: 1, borderRadius: radius.sheet }}>
        <Text style={styles.heading}>Post a Job</Text>

        <Text style={styles.label}>Category</Text>
        <View style={styles.rowWrap}>
          {categories.map((c) => (
            <Chip key={c.id} label={`${c.icon} ${c.name}`} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>

        <Text style={styles.label}>Photos</Text>
        <View style={styles.rowWrap}>
          <Pressable onPress={pickPhoto} style={styles.photoAdd}>
            <Text style={{ color: colors.textMuted, fontSize: 24 }}>+</Text>
          </Pressable>
          {photos.map((url) => (
            <Image key={url} source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 10 }} />
          ))}
        </View>

        <Field label="Job title" placeholder="e.g. AC not cooling" value={title} onChangeText={setTitle} />
        <Field label="Description" multiline numberOfLines={4} value={description} onChangeText={setDescription} />

        <Text style={styles.label}>Urgency</Text>
        <View style={{ marginBottom: 16 }}>
          <SegmentedControl options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
        </View>

        <Field label="Area" placeholder="e.g. Gulshan-e-Iqbal" value={areaLabel} onChangeText={setAreaLabel} />
        <Field label="Exact address (hidden until paid) 🔒" value={exactAddress} onChangeText={setExactAddress} />
        <Pressable onPress={useMyLocation} disabled={locating} style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>
            {locating ? "Locating…" : "📍 Use my current location"}
          </Text>
        </Pressable>

        <View style={styles.benchmarkCard}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            💡 Most jobs like this close between{" "}
            <Text style={{ color: colors.text, fontWeight: "700" }}>PKR 1,800–3,200</Text>
          </Text>
        </View>

        {error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}

        <View style={{ marginTop: 4, marginBottom: 24 }}>
          <Button
            title={submitting ? "Posting…" : "Get Bids →"}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!title || !description || !areaLabel || !exactAddress}
          />
        </View>
      </SheetCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 18 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  photoAdd: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  benchmarkCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 18,
  },
});
