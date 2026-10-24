import { prisma } from "@/lib/prisma";
import { getMarkets, marketForCity, marketForCountry, nearestMarketCity, type MarketSnapshot } from "@/lib/marketConfig";
import { countryOfPhone } from "@/lib/phone";

// The country (and so the currency, ID document and payment methods) of an account comes from the account itself, never
// from where the phone happens to connect from: a Saudi pro testing from Pakistan still sees SAR and "Iqama".
//   pro with a work location -> the nearest market city
//   city set and in a market -> that city (at sign-up, the phone number's country wins over a guessed city)
//   otherwise -> the first city of the phone number's country
// The city found is saved, so every screen (and the website) agrees.

export async function cityForAccount(
  u: { city: string | null; phone: string | null; providerProfile?: { baseLat: number | null; baseLng: number | null } | null },
  opts: { markets?: MarketSnapshot[]; preferPhone?: boolean } = {},
): Promise<string | null> {
  const ms = opts.markets ?? (await getMarkets());
  // 1. A pro's work location always wins (a Pakistani number working in Jeddah is a Jeddah pro).
  const base = u.providerProfile?.baseLat != null && u.providerProfile?.baseLng != null ? nearestMarketCity(ms, { lat: u.providerProfile.baseLat, lng: u.providerProfile.baseLng }) : null;
  if (base) return base.city;
  const cityMarket = u.city ? marketForCity(ms, u.city) : null;
  const phoneCountry = countryOfPhone(u.phone);
  const byPhone = phoneCountry ? marketForCountry(ms, phoneCountry) : null;
  // 2. At sign-up the city is only a guess from the connection: the phone number's country wins over it.
  if (opts.preferPhone && byPhone?.cities[0] && (!cityMarket || cityMarket.countryCode !== phoneCountry)) return byPhone.cities[0];
  // 3. A known city stays; 4. no city: the phone number's country.
  if (cityMarket) return u.city;
  return byPhone?.cities[0] ?? u.city;
}

/** Fixes and saves the city of one account when it is missing or in another country than the account's phone. */
export async function ensureAccountCity(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { city: true, phone: true, providerProfile: { select: { baseLat: true, baseLng: true } } } });
  if (!u) return null;
  const city = await cityForAccount(u);
  if (city && city !== u.city) await prisma.user.update({ where: { id: userId }, data: { city } });
  return city;
}
