// Mirrors the web app's Electric Amber theme (src/app/globals.css) so the
// mobile apps feel like the same product.
export const colors = {
  bg: "#0A0B0F",
  bgElevated: "#12141A",
  bgElevated2: "#171A22",
  sheet: "#151823",
  border: "#1F2330",
  text: "#F5F5F7",
  textMuted: "#9CA0AE",
  accent: "#FFB020",
  accentSoft: "#FFC94D",
  accentForeground: "#0A0B0F",
  secondary: "#22C55E",
  secondaryForeground: "#06170D",
  info: "#3B82F6",
  danger: "#EF4444",
};

export const radius = {
  card: 16,
  sheet: 24,
  button: 14,
  pill: 999,
};

// Applied to react-native-maps <MapView customMapStyle={mapStyle}> so the
// map matches the brand instead of showing default OSM/Google styling —
// the single change the redesign spec calls "50% of the Uber feel."
export const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5C6178" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1F2330" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1C202B" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1C202B" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#20242F" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#262B38" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A1220" }] },
];
