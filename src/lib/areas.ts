import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { parsePolygons, pointInPolygons } from "@/lib/geofence";
import { getMarkets, marketForPoint, type MarketSnapshot } from "@/lib/marketConfig";

// Area master data matching. Free text from a waitlist form, a sheet or a Pro's profile ("defence ph 6", "Block 5
// Clifton", "گلشن اقبال") is turned into an Area row by comparing it against every area name and alias.

export interface AreaRow {
  id: string;
  cityId: string;
  name: string;
  aliases: string[];
  lat: number | null;
  lng: number | null;
  polygon: unknown;
}

/** Lower-case, drop punctuation, unify spellings ("ph" -> "phase", "defense" -> "defence"), collapse spaces. */
export function normalizeAreaText(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/['‘’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w === "ph" || w === "phs" ? "phase" : w === "defense" ? "defence" : w === "blk" ? "block" : w))
    .join(" ");
  return s;
}

/** The area whose name/alias appears in the text (the longest, most specific match wins), or null. */
export function matchAreaByText<T extends AreaRow>(text: string | null | undefined, areas: T[]): T | null {
  if (!text) return null;
  const hay = ` ${normalizeAreaText(text)} `;
  if (hay.trim() === "") return null;
  let best: { area: T; score: number } | null = null;
  for (const area of areas) {
    for (const cand of [area.name, ...area.aliases]) {
      const c = normalizeAreaText(cand);
      if (c.length < 2) continue;
      if (hay.includes(` ${c} `) && (!best || c.length > best.score)) best = { area, score: c.length };
    }
  }
  return best?.area ?? null;
}

/** Point -> area: inside a drawn area polygon, else the nearest area centre within `maxKm`. */
export function matchAreaByPoint<T extends AreaRow>(lat: number, lng: number, areas: T[], maxKm = 3): T | null {
  for (const a of areas) {
    const rings = parsePolygons(a.polygon);
    if (rings.length > 0 && pointInPolygons(lat, lng, rings)) return a;
  }
  let best: { area: T; km: number } | null = null;
  for (const a of areas) {
    if (a.lat == null || a.lng == null) continue;
    const km = haversineKm(lat, lng, a.lat, a.lng);
    if (km <= maxKm && (!best || km < best.km)) best = { area: a, km };
  }
  return best?.area ?? null;
}

export async function loadAreas(countryCode?: string): Promise<(AreaRow & { cityName: string; countryCode: string })[]> {
  const rows = await prisma.area.findMany({
    where: countryCode ? { city: { countryCode } } : undefined,
    include: { city: { select: { name: true, countryCode: true } } },
  });
  return rows.map((a) => ({ id: a.id, cityId: a.cityId, name: a.name, aliases: a.aliases, lat: a.lat, lng: a.lng, polygon: a.polygon, cityName: a.city.name, countryCode: a.city.countryCode }));
}

export interface ResolvedLocation {
  areaId: string | null;
  cityId: string | null;
  zoneId: string | null;
  method: "text" | "point" | "none";
}

/**
 * Text first (what the person wrote), then the map pin. Also finds the service zone: by the pin when there is one,
 * otherwise by the matched area's centre.
 */
export function resolveLocation(
  input: { text?: string | null; lat?: number | null; lng?: number | null; cityName?: string | null },
  areas: (AreaRow & { cityName: string })[],
  markets: MarketSnapshot[],
): ResolvedLocation {
  // A city name in the sheet narrows the candidates when it matches one we know.
  const city = input.cityName ? input.cityName.trim().toLowerCase() : null;
  const pool = city && areas.some((a) => a.cityName.toLowerCase() === city) ? areas.filter((a) => a.cityName.toLowerCase() === city) : areas;

  let area: AreaRow | null = matchAreaByText(input.text, pool);
  let method: ResolvedLocation["method"] = area ? "text" : "none";
  if (!area && input.lat != null && input.lng != null) {
    area = matchAreaByPoint(input.lat, input.lng, pool);
    if (area) method = "point";
  }
  const lat = input.lat ?? area?.lat ?? null;
  const lng = input.lng ?? area?.lng ?? null;
  const zone = lat != null && lng != null ? marketForPoint(markets, { lat, lng }, input.cityName ?? null) : null;
  return { areaId: area?.id ?? null, cityId: area?.cityId ?? null, zoneId: zone?.id ?? null, method };
}

export async function loadResolutionContext(countryCode?: string) {
  const [areas, markets] = await Promise.all([loadAreas(countryCode), getMarkets({ fresh: true })]);
  return { areas, markets };
}
