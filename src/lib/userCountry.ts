import { prisma } from "@/lib/prisma";
import { getMarkets, marketForCity, marketForCountry, nearestMarketCity, type MarketSnapshot } from "@/lib/marketConfig";
import { countryOfPhone } from "@/lib/phone";

// The country of a user (and so the currency, language suggestion, ID document and payment methods) is where they use the app:
//   pro with a work location -> the nearest market city
//   else the country of the internet connection (a Pakistani number used in Saudi Arabia is a Saudi user)
//   else the city on the account, else the phone number's country
// The city found is saved, so every screen (and the website) agrees.

export async function cityForAccount(
  u: { city: string | null; phone: string | null; providerProfile?: { baseLat: number | null; baseLng: number | null } | null },
  opts: { markets?: MarketSnapshot[]; ipCountry?: string | null } = {},
): Promise<string | null> {
  const ms = opts.markets ?? (await getMarkets());
  // 1. A pro's work location always wins (where he actually works).
  const base = u.providerProfile?.baseLat != null && u.providerProfile?.baseLng != null ? nearestMarketCity(ms, { lat: u.providerProfile.baseLat, lng: u.providerProfile.baseLng }) : null;
  if (base) return base.city;
  const cityMarket = u.city ? marketForCity(ms, u.city) : null;
  // 2. Where the phone is being used (internet location): a Pakistani number used in Saudi Arabia is a Saudi user.
  const ip = (opts.ipCountry ?? "").toUpperCase();
  const ipMarket = /^[A-Z]{2}$/.test(ip) && ip !== "XX" ? marketForCountry(ms, ip) : null;
  if (ipMarket?.cities[0] && (!cityMarket || cityMarket.countryCode !== ip)) return ipMarket.cities[0];
  // 3. A known city stays; 4. otherwise the phone number's country.
  if (cityMarket) return u.city;
  const phoneCountry = countryOfPhone(u.phone);
  const byPhone = phoneCountry ? marketForCountry(ms, phoneCountry) : null;
  return byPhone?.cities[0] ?? u.city;
}

/** Fixes and saves the city of one account when it is missing or in another country than the account's phone. */
export async function ensureAccountCity(userId: string, ipCountry?: string | null): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { city: true, phone: true, providerProfile: { select: { baseLat: true, baseLng: true } } } });
  if (!u) return null;
  const city = await cityForAccount(u, { ipCountry });
  if (city && city !== u.city) await prisma.user.update({ where: { id: userId }, data: { city } });
  return city;
}
