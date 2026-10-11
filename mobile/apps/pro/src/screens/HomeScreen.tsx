import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { GlassCard, GradientButton, haptic } from "../components/ds";
import { HeaderActions } from "../components/HeaderActions";
import { JobPinMarker } from "../components/MapPins";
import { NativeAdStrip } from "../components/AdSlots";
import { colors, mapStyle } from "../lib/theme";
import { navigateRoot } from "../navigation/ref";
import { useT } from "../lib/i18n";

interface ProviderProfile {
  displayName: string;
  isOnline: boolean;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  verificationLevel: number;
  baseLat?: number | null;
  baseLng?: number | null;
}

type FeedJob = Awaited<ReturnType<typeof api.getProviderJobFeed>>["jobs"][number];

const KARACHI = { latitude: 24.8607, longitude: 67.0011 };

export default function HomeScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [toggling, setToggling] = useState(false);
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null);
  const [placeLabel, setPlaceLabel] = useState("");
  const [debtPKR, setDebtPKR] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
    api
      .getMe()
      .then(({ user }) => setProfile(user.providerProfile as unknown as ProviderProfile))
      .catch(() => {});
    api
      .getProviderJobFeed()
      .then((feed) => setJobs(feed.jobs.filter((j) => !j.alreadyBid)))
      .catch(() => {});
    api
      .getProviderEarnings()
      .then((e) => setDebtPKR(e.wallet ? Math.max(0, -e.wallet.balancePKR) : 0))
      .catch(() => {});
  }, []);

  useFocusEffect(load);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setMe(here);
      mapRef.current?.animateToRegion({ ...here, latitudeDelta: 0.07, longitudeDelta: 0.07 }, 600);
      try {
        const [place] = await Location.reverseGeocodeAsync(here);
        if (place) setPlaceLabel([place.district ?? place.subregion, place.city].filter(Boolean).join(", "));
      } catch {
        // Label is decoration only.
      }
    })();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  async function toggleOnline() {
    if (!profile || toggling) return;
    setToggling(true);
    haptic.heavy();
    try {
      const { isOnline } = await api.setOnline(!profile.isOnline);
      setProfile({ ...profile, isOnline });
    } finally {
      setToggling(false);
    }
  }

  const pins = useMemo(() => jobs.filter((j) => typeof j.approxLat === "number" && typeof j.approxLng === "number"), [jobs]);

  if (!profile) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const online = profile.isOnline;
  const center = me ?? (profile.baseLat && profile.baseLng ? { latitude: profile.baseLat, longitude: profile.baseLng } : KARACHI);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={mapStyle}
        initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
      >
        {/* The pro's own position: amber dot with a soft halo (distinct from job pins). */}
        <Circle center={center} radius={260} fillColor="rgba(245,166,35,0.16)" strokeColor="rgba(245,166,35,0.35)" strokeWidth={1} />
        <Marker coordinate={center} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.meDot} />
        </Marker>
        {online &&
          pins.map((job) => (
            <JobPinMarker
              key={job.id}
              coordinate={{ latitude: job.approxLat as number, longitude: job.approxLng as number }}
              emoji={job.categoryIcon}
              priceLabel={job.budgetPKR ? `PKR ${job.budgetPKR.toLocaleString()}` : undefined}
              onPress={() => navigateRoot("Main", { screen: "JobsTab", params: { screen: "JobDetail", params: { jobId: job.id } } })}
            />
          ))}
      </MapView>
      {!online && <View style={styles.dim} pointerEvents="none" />}

      <View style={[styles.top, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable onPress={toggleOnline} disabled={toggling} accessibilityRole="switch" accessibilityState={{ checked: online }}>
            <View style={[styles.pill, online ? styles.pillOnline : styles.pillOffline]}>
              <View style={styles.pillDotWrap}>
                {online && (
                  <Animated.View style={[styles.pillPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} pointerEvents="none" />
                )}
                <View style={[styles.pillDot, !online && { backgroundColor: colors.textFaint, shadowOpacity: 0 }]} />
              </View>
              <Text style={[styles.pillText, !online && { color: colors.textSecondary }]}>
                {online ? t("home.listening", { n: jobs.length }) : t("home.offlineTap")}
              </Text>
            </View>
          </Pressable>
          <HeaderActions />
        </View>

        <GlassCard style={styles.trust}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>★ {profile.ratingAvg.toFixed(1)}</Text>
            <Text style={{ color: colors.textFaint }}>·</Text>
            <Text style={{ color: "#D9D2C4", fontSize: 12, fontWeight: "700" }}>
              {profile.verificationLevel >= 1 ? t("home.verified") : t("home.unverified")} · {t("common.level", { n: profile.verificationLevel })}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t("home.jobsDone", { n: profile.jobsCompleted })}</Text>
        </GlassCard>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {debtPKR > 0 && (
          <View style={styles.debt}>
            <Text style={{ fontSize: 12, color: "#E07A7A" }}>{t("home.youOwe")}</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.dangerSoft }}>PKR {debtPKR.toLocaleString()}</Text>
          </View>
        )}

        {profile.verificationLevel < 1 ? (
          <Text style={styles.verifyNote}>{t("home.completeVerification")}</Text>
        ) : (
          <>
            <Text style={styles.sheetSub}>{t("home.jobsAvailable", { n: jobs.length })}</Text>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {placeLabel || t("home.yourArea")}
            </Text>
          </>
        )}

        <GradientButton title={t("home.viewJobs")} onPress={() => navigateRoot("Main", { screen: "JobsTab", params: { screen: "Jobs" } })} />

        <View style={{ marginTop: 14 }}>
          <NativeAdStrip />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(10,8,8,0.55)" },
  meDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: "#15120A",
  },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 18, gap: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1 },
  pillOnline: { backgroundColor: "rgba(245,166,35,0.16)", borderColor: "rgba(245,166,35,0.4)" },
  pillOffline: { backgroundColor: "rgba(20,18,16,0.88)", borderColor: "rgba(255,255,255,0.12)" },
  pillDotWrap: { width: 10, height: 10, alignItems: "center", justifyContent: "center" },
  pillPulse: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  pillText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  trust: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(28,22,10,0.78)", borderColor: "rgba(245,166,35,0.25)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,166,35,0.15)",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#2E2A22", alignSelf: "center", marginBottom: 14 },
  debt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(220,60,60,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,60,60,0.25)",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  sheetSub: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  sheetTitle: { fontSize: 21, fontWeight: "700", color: colors.text, marginBottom: 16 },
  verifyNote: { color: colors.accent, fontWeight: "700", marginBottom: 16, fontSize: 14 },
});
