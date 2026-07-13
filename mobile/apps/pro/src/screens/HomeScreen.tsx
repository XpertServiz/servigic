import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/RootNavigator";
import * as api from "../lib/api";
import { PriceText, haptic } from "../components/ds";
import { colors, mapStyle } from "../lib/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

interface ProviderProfile {
  displayName: string;
  isOnline: boolean;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  verificationLevel: number;
}

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [region, setRegion] = useState({ latitude: 24.8607, longitude: 67.0011, latitudeDelta: 0.08, longitudeDelta: 0.08 });
  const [todayTotal, setTodayTotal] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
    api.getMe().then(({ user }) => setProfile(user.providerProfile as unknown as ProviderProfile));
    api.getProviderEarnings().then((e) => setTodayTotal(e.totalSent));
  }, []);

  useFocusEffect(load);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setRegion((r) => ({ ...r, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
    })();
  }, []);

  useEffect(() => {
    if (!profile?.isOnline) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [profile?.isOnline, pulse]);

  async function toggleOnline() {
    if (!profile) return;
    setTogglingOnline(true);
    haptic.heavy();
    try {
      const { isOnline } = await api.setOnline(!profile.isOnline);
      setProfile({ ...profile, isOnline });
    } finally {
      setTogglingOnline(false);
    }
  }

  if (!profile) return null;
  const online = profile.isOnline;

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        style={StyleSheet.absoluteFill}
        customMapStyle={mapStyle}
        region={region}
        showsUserLocation
        pitchEnabled={false}
      >
        {null}
      </MapView>
      {!online && <View style={styles.dimOverlay} pointerEvents="none" />}

      <View style={[styles.statusBar, online && { backgroundColor: "rgba(34,197,94,0.16)", borderColor: colors.secondary }]}>
        <Text style={[styles.statusText, online && { color: colors.secondary }]}>
          {online ? `You're online · listening for jobs in ${profile.jobsCompleted >= 0 ? "your area" : ""}` : "You're offline"}
        </Text>
      </View>

      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Today</Text>
        <PriceText pkr={todayTotal} size="md" color={online ? colors.secondary : colors.textMuted} />
      </View>

      {profile.verificationLevel < 1 && (
        <View style={styles.verifyCard}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>Complete verification to start bidding</Text>
        </View>
      )}

      <View style={styles.toggleWrap}>
        {online && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
        )}
        <Pressable
          onPress={toggleOnline}
          disabled={togglingOnline}
          style={[styles.goButton, online ? styles.goButtonOnline : styles.goButtonOffline]}
        >
          <Text style={[styles.goButtonText, online && { fontSize: 15, color: colors.secondary }]}>
            {online ? "ONLINE ✓" : "GO ONLINE"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dimOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,11,15,0.55)" },
  statusBar: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "rgba(18,20,26,0.9)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statusText: { color: colors.textMuted, fontWeight: "700", fontSize: 13, textAlign: "center" },
  earningsCard: {
    position: "absolute",
    top: 112,
    left: 16,
    backgroundColor: "rgba(18,20,26,0.9)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  earningsLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  verifyCard: {
    position: "absolute",
    bottom: 160,
    left: 16,
    right: 16,
    backgroundColor: "rgba(18,20,26,0.95)",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 14,
  },
  toggleWrap: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
  },
  goButton: {
    width: 180,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  goButtonOffline: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  goButtonOnline: {
    width: 140,
    height: 48,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  goButtonText: { color: colors.secondaryForeground, fontWeight: "800", fontSize: 17 },
});
