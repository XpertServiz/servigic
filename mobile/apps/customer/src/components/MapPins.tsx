// Real map markers in the redesign's 3D style (spec §1/§2): teardrop job pins
// tagged with a trade emoji + price, a destination pin, and the glossy bike
// badge for live tracking. Rendered as <Marker> children on the Google map
// (custom amber map style in lib/theme.ts). Shared verbatim by apps/customer
// and apps/pro.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker, type LatLng } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";
import { Icon } from "./Icon";

// Marker children are snapshotted to a bitmap by the map; keep tracking on just
// long enough for gradients/emoji to paint, then switch it off (continuous
// tracking is expensive).
function useSettledTracking(deps: unknown[] = []) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return tracking;
}

function Teardrop({ size, children }: { size: number; children: React.ReactNode }) {
  const r = size / 2;
  const shape = {
    width: size,
    height: size,
    borderTopLeftRadius: r,
    borderTopRightRadius: r,
    borderBottomRightRadius: r,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: "-45deg" }],
  } as const;
  return (
    <View style={{ width: size * 1.6, height: size * 1.75, alignItems: "center", justifyContent: "center" }}>
      {/* layered bevel: two darker copies stacked under the face */}
      <View style={[shape, { position: "absolute", backgroundColor: "#5C3F0E", top: size * 0.3 + 6 }]} />
      <View style={[shape, { position: "absolute", backgroundColor: "#8A611C", top: size * 0.3 + 3 }]} />
      <LinearGradient
        colors={["#FFD98A", colors.accent, colors.accentDeep]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[shape, { position: "absolute", top: size * 0.3, alignItems: "center", justifyContent: "center" }]}
      >
        <View style={{ transform: [{ rotate: "45deg" }] }}>{children}</View>
      </LinearGradient>
    </View>
  );
}

export function JobPinMarker({
  coordinate,
  emoji,
  priceLabel,
  dimmed,
  onPress,
}: {
  coordinate: LatLng;
  emoji: string;
  priceLabel?: string;
  dimmed?: boolean;
  onPress?: () => void;
}) {
  const tracking = useSettledTracking([emoji, priceLabel]);
  const size = dimmed ? 28 : 34;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.62 }} tracksViewChanges={tracking} onPress={onPress}>
      <View style={{ alignItems: "center", opacity: dimmed ? 0.85 : 1, paddingBottom: 4 }}>
        <Teardrop size={size}>
          <Text style={{ fontSize: dimmed ? 11 : 14 }}>{emoji}</Text>
        </Teardrop>
        {!!priceLabel && (
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{priceLabel}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

export function DestinationMarker({ coordinate }: { coordinate: LatLng }) {
  const tracking = useSettledTracking();
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.7 }} tracksViewChanges={tracking}>
      <Teardrop size={30}>
        <Icon name="pin-home" size={13} color={colors.accentForeground} />
      </Teardrop>
    </Marker>
  );
}

// Direction of travel (0-360°) from one lat/lng point to the next, used to
// rotate the bike marker so it visually faces the way it's moving.
export function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Glossy extruded bike badge. Slides smoothly to each new ping instead of
// snapping (react-native-maps' imperative animateMarkerToCoordinate, not the
// declarative `coordinate` prop — changing that prop directly just teleports
// the marker). The `coordinate` prop is only ever set once, at mount.
export function TrackedBikeMarker({ location, label }: { location: { lat: number; lng: number }; label?: string }) {
  const markerRef = useRef<InstanceType<typeof Marker>>(null);
  const [initialCoord] = useState({ latitude: location.lat, longitude: location.lng });
  const prevRef = useRef(location);
  const [rotation, setRotation] = useState(0);
  const tracking = useSettledTracking([label]);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev.lat !== location.lat || prev.lng !== location.lng) {
      setRotation(bearingBetween(prev.lat, prev.lng, location.lat, location.lng));
      markerRef.current?.animateMarkerToCoordinate({ latitude: location.lat, longitude: location.lng }, 1000);
      prevRef.current = location;
    }
  }, [location.lat, location.lng]);

  return (
    <Marker
      ref={markerRef}
      coordinate={initialCoord}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      // The bike faces its direction of travel; a labelled marker stays upright so the tag remains readable.
      flat={!label}
      rotation={label ? 0 : rotation}
    >
      <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
        <View style={styles.bikeShadow} />
        <View style={styles.bikeDepth2} />
        <View style={styles.bikeDepth1} />
        <LinearGradient
          colors={["#FFE1A3", colors.accent, colors.accentDeep]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bikeFace}
        >
          <Text style={{ fontSize: 20, transform: [{ rotate: "-22deg" }] }}>🏍️</Text>
        </LinearGradient>
        {!!label && (
          <View style={styles.youTag}>
            <Text style={styles.youText}>{label}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pricePill: {
    marginTop: 2,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priceText: { color: "#E9E2D4", fontSize: 10, fontWeight: "700" },
  bikeShadow: { position: "absolute", bottom: 14, width: 38, height: 10, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.5)" },
  bikeDepth2: { position: "absolute", width: 46, height: 46, borderRadius: 23, backgroundColor: "#5C3F0E", top: 20 },
  bikeDepth1: { position: "absolute", width: 46, height: 46, borderRadius: 23, backgroundColor: "#8A611C", top: 17 },
  bikeFace: {
    position: "absolute",
    top: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "22deg" }],
  },
  youTag: {
    position: "absolute",
    top: 6,
    right: 0,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  youText: { color: colors.accent, fontSize: 9, fontWeight: "700" },
});
