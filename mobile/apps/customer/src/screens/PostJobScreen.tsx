// Post a Job (D3C-PostJob). No ads on this screen — it is a form where an
// interruption costs the user their input.
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { Field } from "../components/ui";
import { GradientButton, SegmentedControl } from "../components/ds";
import { Icon } from "../components/Icon";
import { WaitlistCard } from "../components/MarketNotice";
import { loadMarketConfig } from "../lib/market";
import { playRequestSent } from "../lib/requestSent";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";

type Props = NativeStackScreenProps<HomeStackParamList, "PostJob">;
type Category = Awaited<ReturnType<typeof api.getCategories>>["categories"][number];
type Urgency = "EMERGENCY" | "TODAY" | "SCHEDULED";

export default function PostJobScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(route.params?.categoryId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>(route.params?.urgency ?? "TODAY");
  const [areaLabel, setAreaLabel] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [coords, setCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Market config (handoff section 11.6): only categories switched on in the user's market are offered.
  const [acceptingJobs, setAcceptingJobs] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(null);
  // Service-zone geofence: once the customer's pin is known (GPS), it must be inside an active zone.
  const [pinSet, setPinSet] = useState(false);
  const [pinOutside, setPinOutside] = useState(false);

  useEffect(() => {
    if (!pinSet) return;
    let alive = true;
    loadMarketConfig(userCity, coords).then((cfg) => {
      if (alive) setPinOutside(Boolean(cfg && !cfg.legacyOpen && !cfg.acceptingJobs));
    });
    return () => {
      alive = false;
    };
  }, [pinSet, coords, userCity]);

  // If location permission was already granted, start from where the customer really is instead of a default.
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") return;
        const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
        if (pos) {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPinSet(true);
        }
      } catch {
        // keep the default pin
      }
    })();
  }, []);

  useEffect(() => {
    api
      .getMe()
      .then(({ user }) => setUserCity(typeof user.city === "string" ? user.city : null))
      .catch(() => {});
    api
      .getCategories()
      .then(({ categories: fetched, acceptingJobs: accepting }) => {
        setCategories(fetched);
        setAcceptingJobs(accepting !== false);
        const firstAvailable = fetched.find((c) => c.available);
        const wanted = fetched.find((c) => c.id === route.params?.categoryId && c.available);
        if (!wanted && firstAvailable) setCategoryId(firstAvailable.id);
      })
      .catch(() => {});
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
      setPinSet(true);
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          const formatted = [place.streetNumber, place.street, place.district ?? place.subregion, place.city].filter(Boolean).join(", ");
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
      setError(e instanceof Error ? e.message : t("post.uploadFailed"));
    }
  }

  async function submit(allowDuplicate = false) {
    setError(null);
    setSubmitting(true);
    try {
      const { job } = await api.createJob({
        categoryId,
        title,
        description,
        photos,
        urgency,
        city: userCity ?? "Karachi",
        areaLabel,
        exactAddress,
        lat: coords.lat,
        lng: coords.lng,
        ...(allowDuplicate ? { allowDuplicate: true } : {}),
      });
      playRequestSent();
      navigation.replace("JobDetail", { jobId: job.id });
    } catch (e) {
      if (e instanceof api.ApiError && e.code === "DUPLICATE_OPEN_JOB") {
        // Soft, non-blocking prompt: point at the existing request, but let
        // the customer post a second one if they really want to.
        const existing = e.data.existingJob as { id: string; title: string } | undefined;
        const category = categories.find((c) => c.id === categoryId)?.name ?? "";
        Alert.alert(t("post.duplicateTitle"), t("post.duplicateBody", { category }), [
          ...(existing ? [{ text: t("post.openExisting"), onPress: () => navigation.replace("JobDetail", { jobId: existing.id }) }] : []),
          { text: t("post.postAnyway"), onPress: () => submit(true) },
          { text: t("common.cancel"), style: "cancel" as const },
        ]);
      } else if (e instanceof api.ApiError && e.code === "MARKET_NOT_AVAILABLE") {
        setAcceptingJobs(false);
      } else if (e instanceof api.ApiError && e.code === "CATEGORY_NOT_AVAILABLE") {
        setError(t("market.categoryUnavailable"));
      } else {
        setError(e instanceof Error ? e.message : t("post.failed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const urgencyOptions: { value: Urgency; label: string; tone?: "danger" }[] = [
    { value: "EMERGENCY", label: `⚡ ${t("urgency.EMERGENCY")}`, tone: "danger" },
    { value: "TODAY", label: t("urgency.TODAY") },
    { value: "SCHEDULED", label: t("urgency.SCHEDULED") },
  ];

  const available = categories.filter((c) => c.available);

  if (!acceptingJobs || pinOutside) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 18, paddingTop: insets.top + 16, gap: 14 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <WaitlistCard
          title={t("market.outsideTitle")}
          body={t("market.outsideBody")}
          role="CUSTOMER"
          city={userCity}
          trade={categories.find((c) => c.id === categoryId)?.trade}
          point={pinSet ? coords : undefined}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel={t("common.back")}>
          <Icon name="back" size={16} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("post.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t("post.category")}</Text>
        <View style={styles.rowWrap}>
          {available.map((c) => {
            const active = categoryId === c.id;
            return (
              <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.catChip, active && styles.catChipActive]}>
                <Text style={{ fontSize: 12, fontWeight: active ? "800" : "600", color: active ? colors.accent : colors.textSecondary }}>
                  {c.icon} {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>{t("post.photos")}</Text>
        <View style={styles.rowWrap}>
          <Pressable onPress={pickPhoto} style={styles.photoAdd} accessibilityLabel={t("post.addPhoto")}>
            <Text style={{ color: colors.accent, fontSize: 24, fontWeight: "300" }}>+</Text>
          </Pressable>
          {photos.map((url) => (
            <Image key={url} source={{ uri: url }} style={{ width: 68, height: 68, borderRadius: 14 }} />
          ))}
        </View>

        <Field label={t("post.jobTitle")} placeholder={t("post.titlePlaceholder")} value={title} onChangeText={setTitle} />
        <Field label={t("post.description")} multiline numberOfLines={4} value={description} onChangeText={setDescription} />

        <Text style={styles.label}>{t("post.urgency")}</Text>
        <View style={{ marginBottom: 18 }}>
          <SegmentedControl options={urgencyOptions} value={urgency} onChange={setUrgency} />
        </View>

        <Field label={t("post.area")} placeholder={t("post.areaPlaceholder")} value={areaLabel} onChangeText={setAreaLabel} />
        <Field label={`${t("post.exactAddress")} 🔒`} value={exactAddress} onChangeText={setExactAddress} />
        <Pressable onPress={useMyLocation} disabled={locating} style={{ marginBottom: 18 }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{locating ? t("post.locating") : `📍 ${t("post.useLocation")}`}</Text>
        </Pressable>

        <View style={styles.benchmark}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            💡 {t("post.benchmark")} <Text style={{ color: colors.text, fontWeight: "700" }}>PKR 1,800–3,200</Text>
          </Text>
        </View>

        {error && <Text style={{ color: colors.dangerSoft, marginBottom: 12 }}>{error}</Text>}
      </ScrollView>

      <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 14) + 4 }}>
        <GradientButton
          title={submitting ? t("post.posting") : t("post.submit")}
          onPress={() => submit(false)}
          disabled={submitting || !title || !description || !areaLabel || !exactAddress || !categoryId}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 10, marginTop: 4 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  catChip: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9 },
  catChipActive: { backgroundColor: colors.accentTint, borderColor: "rgba(245,166,35,0.5)" },
  photoAdd: { width: 68, height: 68, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(245,166,35,0.35)", alignItems: "center", justifyContent: "center" },
  benchmark: { backgroundColor: colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, marginBottom: 18 },
});
