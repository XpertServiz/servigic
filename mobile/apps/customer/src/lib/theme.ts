// "Premium-Dark Evolution" tokens (SERVIGIC_REDESIGN_HANDOFF.md §1).
// Shared verbatim by apps/customer and apps/pro — if you change one, copy the
// change to the other.
import { Platform } from "react-native";
import { PROVIDER_GOOGLE } from "react-native-maps";
export const colors = {
  // Surfaces
  bg: "#0A0808", // near-black, deliberately not pure #000
  bgElevated: "#141210", // cards, sheets, tab bar
  bgElevated2: "#1C1A16", // secondary card fill, chat bubbles
  sheet: "#141210",
  border: "#262219", // hairlines + "pending" dots
  borderSoft: "rgba(255,255,255,0.07)",

  // Text
  text: "#FFFFFF",
  textSecondary: "#C7C2B6",
  textMuted: "#9A9284",
  textFaint: "#6B6456", // placeholders, disabled
  textFainter: "#726C60",

  // Brand accent — the one colour used sparingly but consistently
  accent: "#F5A623",
  accentSoft: "#FFD98A",
  accentDeep: "#C97F12",
  accentForeground: "#15120A",
  accentTint: "rgba(245,166,35,0.14)",
  accentBorder: "rgba(245,166,35,0.35)",

  // Semantic. `secondary` is kept as the name existing screens use for
  // "success/positive" — it is the redesign's success green.
  secondary: "#1EC28B",
  secondaryForeground: "#06261C",
  success: "#1EC28B",
  danger: "#E2574C",
  dangerSoft: "#F08A8A",
  dangerTint: "rgba(220,60,60,0.1)",
  info: "#3B82F6",

  // Glass-morphism cards floating over the map
  glassBg: "rgba(20,18,16,0.82)",
  glassBorder: "rgba(245,166,35,0.3)",
};

// 135° brand gradient for CTAs and 3D surfaces.
export const accentGradient = ["#FFD98A", "#F5A623", "#C97F12"] as const;
export const accentGradientStops = [0, 0.55, 1] as const;

export const radius = {
  card: 16,
  sheet: 24,
  button: 14,
  pill: 999,
};

// Applied to react-native-maps <MapView customMapStyle={mapStyle}>: dark base
// with the road network rendered in amber instead of Google's default grey,
// matching the redesign mock-ups. Used on Pro Home, Pro "On the way" and
// Customer live tracking.
export const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#100D09" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0808" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6B5A3C" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2A2113" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8A7345" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#5A4A32" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0F0C08" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3A2C14" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1A140A" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7A6640" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#5C4119" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#F5A623" }, { lightness: -35 }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#8A5A0C" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0B0907" }] },
];

// customMapStyle (the amber roads) only renders on the Google provider. Android
// always uses it. On iOS it needs a Google Maps iOS API key baked into the build
// (GOOGLE_MAPS_IOS_API_KEY at build time + EXPO_PUBLIC_IOS_GOOGLE_MAPS=true); without
// one the map falls back to Apple Maps, which works but ignores the custom style.
export const mapProvider = Platform.OS === "android" || process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS === "true" ? PROVIDER_GOOGLE : undefined;
