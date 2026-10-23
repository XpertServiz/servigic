import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Trade, MarketStatus, Currency } from "@prisma/client";
import { parsePolygons, pointInPolygons, type Ring } from "@/lib/geofence";
import { cityCenter } from "@/lib/cityCenters";
import { haversineKm } from "@/lib/geo";

// Market configuration (handoff §11.6). The whole table is tiny, so it is
// read as one cached snapshot (60s, busted by the admin editor).
export interface MarketSnapshot {
  id: string;
  countryCode: string;
  name: string;
  cities: string[];
  enabled: boolean;
  status: MarketStatus;
  currency: Currency;
  phoneCode: string;
  timezone: string;
  /** Drawn geofence (see geofence.ts); empty = the zone is defined by its city names only. */
  polygons: Ring[];
  /** Overrides in the market's own currency; null = automatic (see walletLimits.ts). */
  walletCeiling: number | null;
  minTopUp: number | null;
  /** trade → { enabled, maxActivePros } */
  trades: Record<string, { enabled: boolean; maxActivePros: number | null }>;
}

async function readMarkets(): Promise<MarketSnapshot[]> {
    const rows = await prisma.market.findMany({ include: { categories: true }, orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
    return rows.map((m) => ({
      id: m.id,
      countryCode: m.countryCode,
      name: m.name,
      cities: m.cities,
      enabled: m.enabled,
      status: m.status,
      currency: m.currency,
      phoneCode: m.phoneCode,
      timezone: m.timezone,
      polygons: parsePolygons(m.polygons),
      walletCeiling: m.walletCeiling,
      minTopUp: m.minTopUp,
      trades: Object.fromEntries(m.categories.map((c) => [c.trade, { enabled: c.enabled, maxActivePros: c.maxActivePros }])),
    }));
}

const loadMarkets = unstable_cache(readMarkets, ["markets"], { revalidate: 60, tags: ["markets"] });

/** `fresh` skips the 60s cache (admin edits and the activation pass must see the row just written). */
export async function getMarkets(opts: { fresh?: boolean } = {}): Promise<MarketSnapshot[]> {
  try {
    return opts.fresh ? await readMarkets() : await loadMarkets();
  } catch {
    return [];
  }
}

export function bustMarketCache() {
  try {
    revalidateTag("markets", "max");
  } catch {
    // outside a request context (scripts/tests) — the 60s TTL covers it
  }
}

const norm = (s: string) => s.trim().toLowerCase();

export function marketForCity(markets: MarketSnapshot[], city: string | null | undefined): MarketSnapshot | null {
  if (!city) return null;
  const c = norm(city);
  return markets.find((m) => m.cities.some((x) => norm(x) === c)) ?? null;
}

export type GeoPoint = { lat: number; lng: number };

/**
 * The market city nearest to a map point, within `maxKm`: a pin in Madinah gives Madinah even when the account was
 * created with Jeddah (or, from an old app, with Karachi).
 */
export function nearestMarketCity(markets: MarketSnapshot[], point: GeoPoint, maxKm = 150): { city: string; market: MarketSnapshot; km: number } | null {
  let best: { city: string; market: MarketSnapshot; km: number } | null = null;
  for (const m of markets) {
    for (const city of m.cities) {
      const c = cityCenter(city);
      if (!c) continue;
      const km = haversineKm(point.lat, point.lng, c.lat, c.lng);
      if (km <= maxKm && (!best || km < best.km)) best = { city, market: m, km };
    }
  }
  return best;
}

/**
 * The zone a map point belongs to. A zone with a drawn geofence owns exactly the points inside it; zones without one
 * own the points near their cities (the nearest market city within 150 km); only then does the city name decide.
 */
export function marketForPoint(markets: MarketSnapshot[], point: GeoPoint, city?: string | null): MarketSnapshot | null {
  const drawn = markets.find((m) => m.polygons.length > 0 && pointInPolygons(point.lat, point.lng, m.polygons));
  if (drawn) return drawn;
  const open = markets.filter((m) => m.polygons.length === 0);
  const near = nearestMarketCity(open, point);
  if (near) return near.market;
  return marketForCity(open, city);
}

/**
 * Where a new job really is. The pin is trusted when it lies in the same country as the account's city, and the job then
 * takes the nearest market city (a customer registered as "Jeddah" posting from Madinah posts a Madinah job). A pin in
 * another country is the app's default map position (no GPS), so the job is placed at the centre of the account's city.
 */
export function placeJob(markets: MarketSnapshot[], city: string, point: GeoPoint): { city: string; lat: number; lng: number } {
  const near = nearestMarketCity(markets, point);
  const cityMarket = marketForCity(markets, city);
  if (near && (!cityMarket || near.market.countryCode === cityMarket.countryCode)) return { city: near.city, lat: point.lat, lng: point.lng };
  if (near && cityMarket && near.market.countryCode !== cityMarket.countryCode) {
    const c = cityCenter(city);
    if (c) return { city, lat: c.lat, lng: c.lng };
  }
  return { city, lat: point.lat, lng: point.lng };
}

/** First enabled market of a country (used before a city is known, e.g. on first launch). */
export function marketForCountry(markets: MarketSnapshot[], countryCode: string | null | undefined): MarketSnapshot | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  const inCountry = markets.filter((m) => m.countryCode === cc);
  return inCountry.find((m) => acceptsJobs(m)) ?? inCountry[0] ?? null;
}

/** The user's market: by their city, or (if they have none yet) by the IP country of the request. */
export function resolveMarket(markets: MarketSnapshot[], city: string | null | undefined, geoCountry: string | null | undefined): MarketSnapshot | null {
  return city ? marketForCity(markets, city) : marketForCountry(markets, geoCountry);
}

/** A market accepts jobs only while switched on AND past the waitlist stage. */
export function acceptsJobs(m: MarketSnapshot | null): boolean {
  return Boolean(m && m.enabled && (m.status === "PILOT" || m.status === "LIVE"));
}

export function tradeEnabled(m: MarketSnapshot | null, trade: Trade | string): boolean {
  return Boolean(m && m.trades[trade]?.enabled);
}

export type Availability = { ok: true } | { ok: false; code: "MARKET_NOT_AVAILABLE" | "CATEGORY_NOT_AVAILABLE"; message: string };

/**
 * Can a job of this trade be posted in this city? If no markets are configured
 * at all (table empty / unreachable) we fail open so the platform keeps
 * working exactly as it did before market config existed.
 */
export async function checkJobAvailability(city: string, trade: Trade | string, point?: GeoPoint): Promise<Availability> {
  const markets = await getMarkets();
  if (markets.length === 0) return { ok: true };
  // With a map point (the job pin) the geofence decides; without one we only know the city name.
  const market = point ? marketForPoint(markets, point, city) : marketForCity(markets, city);
  if (!market || !acceptsJobs(market)) {
    return { ok: false, code: "MARKET_NOT_AVAILABLE", message: "Servigic isn't available in your area yet." };
  }
  if (!tradeEnabled(market, trade)) {
    return { ok: false, code: "CATEGORY_NOT_AVAILABLE", message: "This service isn't available in your area yet." };
  }
  return { ok: true };
}
