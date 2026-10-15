import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Trade, MarketStatus, Currency } from "@prisma/client";

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
export async function checkJobAvailability(city: string, trade: Trade | string): Promise<Availability> {
  const markets = await getMarkets();
  if (markets.length === 0) return { ok: true };
  const market = marketForCity(markets, city);
  if (!market || !acceptsJobs(market)) {
    return { ok: false, code: "MARKET_NOT_AVAILABLE", message: "Servigic isn't available in your area yet." };
  }
  if (!tradeEnabled(market, trade)) {
    return { ok: false, code: "CATEGORY_NOT_AVAILABLE", message: "This service isn't available in your area yet." };
  }
  return { ok: true };
}
