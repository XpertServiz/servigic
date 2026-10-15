// Service-zone geofences. A zone's boundary is a list of polygons drawn on the admin map; each polygon is a
// ring of [lat, lng] points (at least 3, not repeated at the end).
export type Ring = [number, number][];

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Reads the JSON stored on Market.polygons, dropping anything malformed. */
export function parsePolygons(json: unknown): Ring[] {
  if (!Array.isArray(json)) return [];
  const rings: Ring[] = [];
  for (const raw of json) {
    if (!Array.isArray(raw)) continue;
    const ring: Ring = [];
    for (const pt of raw) {
      if (Array.isArray(pt) && isNum(pt[0]) && isNum(pt[1]) && pt[0] >= -90 && pt[0] <= 90 && pt[1] >= -180 && pt[1] <= 180) ring.push([pt[0], pt[1]]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

/** Ray casting: is the point inside the ring? Points exactly on an edge count as inside only by chance. */
export function pointInRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const crosses = lngI > lng !== lngJ > lng && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointInPolygons(lat: number, lng: number, rings: Ring[]): boolean {
  return rings.some((r) => pointInRing(lat, lng, r));
}
