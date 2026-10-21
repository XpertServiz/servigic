// Approximate centre points for the cities in the seeded markets. Only a fallback for jobs an admin posts
// without exact coordinates: pros are matched by distance from this point, so a pasted Google Maps
// "lat, lng" is always better. Keys are lower-case.
const CENTERS: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.8607, lng: 67.0011 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  montreal: { lat: 45.5017, lng: -73.5673 },
  calgary: { lat: 51.0447, lng: -114.0719 },
  ottawa: { lat: 45.4215, lng: -75.6972 },
  jeddah: { lat: 21.4858, lng: 39.1925 },
  madinah: { lat: 24.5247, lng: 39.5692 },
  riyadh: { lat: 24.7136, lng: 46.6753 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  "abu dhabi": { lat: 24.4539, lng: 54.3773 },
  sharjah: { lat: 25.3463, lng: 55.4209 },
  doha: { lat: 25.2854, lng: 51.531 },
  "new york": { lat: 40.7128, lng: -74.006 },
  berlin: { lat: 52.52, lng: 13.405 },
  warsaw: { lat: 52.2297, lng: 21.0122 },
};

export function cityCenter(city: string) {
  return CENTERS[city.trim().toLowerCase()] ?? null;
}

/** Parses "24.8607, 67.0011" (what Google Maps copies) into numbers, or null if it is not a valid pair. */
export function parseLatLng(input: string | undefined | null): { lat: number; lng: number } | null {
  if (!input) return null;
  const m = input.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
}
