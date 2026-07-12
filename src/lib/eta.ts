import { haversineKm } from "@/lib/geo";

// Zero-cost ETA estimate — straight-line distance ÷ an assumed average
// urban speed (accounts for traffic/stops, not just open-road speed). Less
// accurate than a real routing API (Google Distance Matrix, OSRM, etc.),
// but free and always available, matching Master Brief §8's zero-cost
// architecture (no paid Maps billing).
const ASSUMED_AVG_SPEED_KMH = 22;

export function estimateEtaMinutes(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const minutes = (distanceKm / ASSUMED_AVG_SPEED_KMH) * 60;
  return Math.max(1, Math.round(minutes));
}
