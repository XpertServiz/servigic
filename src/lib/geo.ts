import ngeohash from "ngeohash";

export const GEOHASH_PRECISION = 6; // ~1.2km x 0.6km cells, plenty for a service radius filter

export function encodeGeohash(lat: number, lng: number): string {
  return ngeohash.encode(lat, lng, GEOHASH_PRECISION);
}

// Neighboring cells so a job near a cell boundary still reaches nearby providers.
export function geohashNeighborhood(geohash: string): string[] {
  return [geohash, ...ngeohash.neighbors(geohash)];
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
