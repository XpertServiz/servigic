import { getMarkets, acceptsJobs } from "@/lib/marketConfig";
import { LIVE_CITIES } from "@/lib/markets";
import { cityCenter } from "@/lib/cityCenters";

// The cities Servigic actually serves right now, read from the markets the admin switched on (Markets & Launch / the country
// switches), so a newly opened country appears in every city picker, service page and sitemap without a code change.
// With no markets configured at all it falls back to the original Pakistani list.

export async function getLiveCities(preferCountry?: string | null): Promise<string[]> {
  const markets = (await getMarkets()).filter((m) => acceptsJobs(m));
  if (markets.length === 0) return [...LIVE_CITIES];
  const preferred = preferCountry ? markets.filter((m) => m.countryCode === preferCountry.toUpperCase()) : [];
  const others = markets.filter((m) => !preferred.includes(m));
  return Array.from(new Set([...preferred, ...others].flatMap((m) => m.cities)));
}

/** Only the cities of one country (the visitor's), in market order; empty when the country has no live market. */
export async function getCountryCities(country: string | null | undefined): Promise<string[]> {
  if (!country) return [];
  const markets = (await getMarkets()).filter((m) => acceptsJobs(m) && m.countryCode === country.toUpperCase());
  return Array.from(new Set(markets.flatMap((m) => m.cities)));
}

export async function getCitySlugs(preferCountry?: string | null): Promise<{ name: string; slug: string }[]> {
  return (await getLiveCities(preferCountry)).map((c) => ({ name: c, slug: c.toLowerCase().replace(/\s+/g, "-") }));
}

export async function slugToLiveCity(slug: string): Promise<string | null> {
  const s = slug.toLowerCase();
  return (await getCitySlugs()).find((c) => c.slug === s)?.name ?? null;
}

/** Map centre for a city (for the post-job map default); Karachi when unknown. */
export function centerOfCity(city: string): { lat: number; lng: number } {
  return cityCenter(city) ?? { lat: 24.8607, lng: 67.0011 };
}
