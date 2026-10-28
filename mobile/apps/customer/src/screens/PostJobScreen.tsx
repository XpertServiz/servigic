// Post a Job (D3C-PostJob). No ads on this screen — it is a form where an
// interruption costs the user their input.
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { defaultCenter } from "../lib/defaultCenter";
import { Field } from "../components/ui";
import { GradientButton, SegmentedControl } from "../components/ds";
import { Icon } from "../components/Icon";
import { WaitlistCard } from "../components/MarketNotice";
import { OfferField } from "../components/OfferField";
import { loadMarketConfig } from "../lib/market";
import { playVoiceAlert } from "../lib/voiceAlerts";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { tradeLabel } from "../lib/status";
import { areaExample } from "../lib/areaExamples";

// Media limits (same as the server, src/lib/mediaLimits.ts): one photo up to 4 MB and one video up to 32 MB / 30 seconds.
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
const VIDEO_MAX_BYTES = 32 * 1024 * 1024;
const VIDEO_MAX_SECONDS = 30;
const mb = (b: number) => Math.round((b / (1024 * 1024)) * 10) / 10;
import { SchedulePicker, type ScheduleValue } from "../components/SchedulePicker";

type Props = NativeStackScreenProps<HomeStackParamList, "PostJob">;
type Category = Awaited<ReturnType<typeof api.getCategories>>["categories"][number];
type Urgency = "EMERGENCY" | "TODAY" | "SCHEDULED";

export default function PostJobScreen({ navigation, route }: Props) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(route.params?.categoryId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>(route.params?.urgency ?? "TODAY");
  // Car towing / roadside help is urgent by default (the customer can still change it).
  const urgencyChosen = React.useRef(Boolean(route.params?.urgency));
  const [areaLabel, setAreaLabel] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [coords, setCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  // One optional short video (max 32 MB / 30 s).
  const [video, setVideo] = useState<{ url: string; seconds: number } | null>(null);
  const [uploading, setUploading] = useState<"photo" | "video" | null>(null);
  // Scheduled job: the day first, then the arrival window.
  const [schedule, setSchedule] = useState<ScheduleValue | null>(null);
  // Open requests now / maximum (5 at a time, against fake or duplicate requests).
  const [quota, setQuota] = useState<{ open: number; max: number; remaining: number } | null>(null);
  useEffect(() => {
    api.getRequestQuota().then(setQuota).catch(() => {});
  }, []);
  // The price the customer wants to pay (in his own currency); pros accept it or answer with their own.
  const [offer, setOffer] = useState("");
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
      .then(({ user }) => {
        const city = typeof user.city === "string" ? user.city : null;
        setUserCity(city);
        // Until GPS gives the real spot, start the pin in the customer's own city (not Karachi for someone in Saudi Arabia).
        defaultCenter(city).then((c) => setCoords((cur) => (cur.lat === 24.8607 && cur.lng === 67.0011 ? c : cur)));
      })
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

  // Sizes of a picked file (some Android pickers do not report it, so ask the file system).
  async function sizeOf(asset: ImagePicker.ImagePickerAsset): Promise<number> {
    if (asset.fileSize) return asset.fileSize;
    const info = await FileSystem.getInfoAsync(asset.uri);
    return info.exists && "size" in info ? (info.size ?? 0) : 0;
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const size = await sizeOf(asset);
    if (size > PHOTO_MAX_BYTES) {
      Alert.alert(t("post.mediaTooBigTitle"), t("post.photoTooBig", { size: mb(size), max: mb(PHOTO_MAX_BYTES) }));
      return;
    }
    setUploading("photo");
    try {
      const url = await api.uploadFile(asset.uri, asset.fileName ?? "photo.jpg", asset.mimeType ?? "image/jpeg");
      setPhotos([url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("post.uploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  async function pickVideo(source: "camera" | "library") {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["videos"], videoMaxDuration: VIDEO_MAX_SECONDS, quality: 0.6 };
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") return;
    }
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const seconds = asset.duration ? asset.duration / 1000 : 0;
    const size = await sizeOf(asset);
    if (seconds > VIDEO_MAX_SECONDS + 1) {
      Alert.alert(t("post.mediaTooBigTitle"), t("post.videoTooLong", { seconds: Math.round(seconds), max: VIDEO_MAX_SECONDS }));
      return;
    }
    if (size > VIDEO_MAX_BYTES) {
      Alert.alert(t("post.mediaTooBigTitle"), t("post.videoTooBig", { size: mb(size), max: mb(VIDEO_MAX_BYTES), seconds: VIDEO_MAX_SECONDS }));
      return;
    }
    setUploading("video");
    try {
      const url = await api.uploadJobVideo(asset.uri, asset.fileName ?? "video.mp4", asset.mimeType ?? "video/mp4", size, seconds || undefined);
      setVideo({ url, seconds: Math.round(seconds) });
    } catch (e) {
      if (e instanceof api.ApiError && (e.code === "VIDEO_TOO_LARGE" || e.status === 413)) Alert.alert(t("post.mediaTooBigTitle"), t("post.videoTooBig", { size: mb(size), max: mb(VIDEO_MAX_BYTES), seconds: VIDEO_MAX_SECONDS }));
      else setError(e instanceof Error ? e.message : t("post.uploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  function chooseVideo() {
    Alert.alert(t("post.videoTitle"), t("post.videoHint", { seconds: VIDEO_MAX_SECONDS, max: mb(VIDEO_MAX_BYTES) }), [
      { text: t("post.videoRecord"), onPress: () => pickVideo("camera") },
      { text: t("post.videoGallery"), onPress: () => pickVideo("library") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
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
        ...(video ? { videoUrl: video.url } : {}),
        urgency,
        ...(urgency === "SCHEDULED" && schedule ? schedule : {}),
        city: userCity ?? "Karachi",
        ...(Number(offer) > 0 ? { budgetPKR: Number(offer) } : {}),
        areaLabel,
        exactAddress,
        lat: coords.lat,
        lng: coords.lng,
        ...(allowDuplicate ? { allowDuplicate: true } : {}),
      });
      playVoiceAlert("request_sent", { volume: 0.6 }); // quiet in-app confirmation
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
      } else if (e instanceof api.ApiError && e.code === "OPEN_JOB_LIMIT") {
        Alert.alert(t("request.limitTitle"), t("request.limitBody", { max: Number(e.data.max ?? 5) }));
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
  const selectedTrade = categories.find((c) => c.id === categoryId)?.trade;
  React.useEffect(() => {
    if (selectedTrade === "TOWING" && !urgencyChosen.current) setUrgency("EMERGENCY");
  }, [selectedTrade]);

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
        {quota && (
          <View style={[styles.quota, quota.remaining === 0 && { borderColor: colors.dangerSoft }]}>
            <Text style={{ color: quota.remaining === 0 ? colors.dangerSoft : colors.textSecondary, fontSize: 12.5, lineHeight: 18 }}>{t("request.counter", { open: quota.open, max: quota.max, remaining: quota.remaining })}</Text>
          </View>
        )}
        <Text style={styles.label}>{t("post.category")}</Text>
        <View style={styles.rowWrap}>
          {available.map((c) => {
            const active = categoryId === c.id;
            return (
              <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.catChip, active && styles.catChipActive]}>
                <Text style={{ fontSize: 12, fontWeight: active ? "800" : "600", color: active ? colors.accent : colors.textSecondary }}>
                  {c.icon} {tradeLabel(t, c.trade, c.name)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>{t("post.mediaLabel")}</Text>
        <View style={styles.rowWrap}>
          {photos[0] ? (
            <Pressable onPress={() => setPhotos([])} accessibilityLabel={t("post.removeMedia")}>
              <Image source={{ uri: photos[0] }} style={{ width: 68, height: 68, borderRadius: 14 }} />
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : (
            <Pressable onPress={pickPhoto} disabled={uploading !== null} style={styles.photoAdd} accessibilityLabel={t("post.addPhoto")}>
              <Text style={{ color: colors.accent, fontSize: uploading === "photo" ? 12 : 22, fontWeight: "400" }}>{uploading === "photo" ? "…" : "📷"}</Text>
              <Text style={styles.mediaHint}>{t("post.photoShort")}</Text>
            </Pressable>
          )}
          {video ? (
            <Pressable onPress={() => setVideo(null)} style={[styles.photoAdd, { borderStyle: "solid", borderColor: colors.success }]} accessibilityLabel={t("post.removeMedia")}>
              <Text style={{ color: colors.success, fontSize: 20 }}>🎬</Text>
              <Text style={[styles.mediaHint, { color: colors.success }]}>{video.seconds ? `${video.seconds}s ✓` : "✓"}</Text>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : (
            <Pressable onPress={chooseVideo} disabled={uploading !== null} style={styles.photoAdd} accessibilityLabel={t("post.videoTitle")}>
              <Text style={{ color: colors.accent, fontSize: uploading === "video" ? 12 : 22 }}>{uploading === "video" ? t("post.uploadingVideo") : "🎬"}</Text>
              <Text style={styles.mediaHint}>{t("post.videoShort", { seconds: VIDEO_MAX_SECONDS })}</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.mediaNote}>{t("post.mediaNote", { photo: mb(PHOTO_MAX_BYTES), video: mb(VIDEO_MAX_BYTES), seconds: VIDEO_MAX_SECONDS })}</Text>

        <Field label={t("post.jobTitle")} placeholder={t("post.titlePlaceholder")} value={title} onChangeText={setTitle} />
        <Field label={t("post.description")} multiline numberOfLines={4} value={description} onChangeText={setDescription} />

        {/* The customer's own price (like inDrive), right under the description so nobody misses it. */}
        <OfferField categoryId={categoryId} city={userCity} value={offer} onChange={setOffer} />

        <Text style={styles.label}>{t("post.urgency")}</Text>
        <View style={{ marginBottom: 18 }}>
          <SegmentedControl options={urgencyOptions} value={urgency} onChange={(v) => { urgencyChosen.current = true; setUrgency(v); }} />
        </View>
        {urgency === "SCHEDULED" && <SchedulePicker value={schedule} onChange={setSchedule} />}

        <Field label={t("post.area")} placeholder={areaExample(userCity, lang) ? t("post.areaPlaceholder", { area: areaExample(userCity, lang) ?? "" }) : t("post.areaPlaceholderPlain")} value={areaLabel} onChangeText={setAreaLabel} />
        <Field label={`${t("post.exactAddress")} 🔒`} value={exactAddress} onChangeText={setExactAddress} />
        <Pressable onPress={useMyLocation} disabled={locating} style={{ marginBottom: 18 }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{locating ? t("post.locating") : `📍 ${t("post.useLocation")}`}</Text>
        </Pressable>


        {error && <Text style={{ color: colors.dangerSoft, marginBottom: 12 }}>{error}</Text>}
      </ScrollView>

      <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 14) + 4 }}>
        <GradientButton
          title={submitting ? t("post.posting") : t("post.submit")}
          onPress={() => submit(false)}
          disabled={submitting || uploading !== null || !title || !description || !areaLabel || !exactAddress || !categoryId || (urgency === "SCHEDULED" && !schedule)}
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
  quota: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 10, marginBottom: 14, backgroundColor: colors.bgElevated },
  remove: { position: "absolute", top: -6, right: -6, backgroundColor: colors.bg, color: colors.dangerSoft, borderRadius: 10, overflow: "hidden", paddingHorizontal: 5, fontWeight: "900" },
  mediaHint: { color: colors.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" },
  mediaNote: { color: colors.textFainter, fontSize: 11, lineHeight: 15, marginTop: -10, marginBottom: 16 },
  photoAdd: { width: 76, height: 76, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(245,166,35,0.35)", alignItems: "center", justifyContent: "center" },
});
