import { prisma } from "@/lib/prisma";
import { Trade, type Currency, type MarketStatus } from "@prisma/client";
import { bustMarketCache } from "@/lib/marketConfig";
import { activateWaitingForMarket } from "@/lib/proActivation";
import { notifyWaitlistForMarket } from "@/lib/waitlistNotify";

// One switch per country. "Countries & Localization" (LocaleConfig: language, currency, display) and "Markets & Launch"
// (Market: the zones that actually accept accounts and jobs) used to be two unrelated lists, so enabling Saudi Arabia in
// the first left the second without a Saudi market and every Saudi user saw "launching in your area". Both now go through
// here: the country state below is applied to the LocaleConfig row AND to every Market of that country (created on demand).
export type CountryState = "off" | "waitlist" | "pilot" | "live";

const COUNTRY_DEFAULTS: Record<string, { name: string; currency: Currency; phoneCode: string; timezone: string; cities: string[] }> = {
  PK: { name: "Pakistan", currency: "PKR", phoneCode: "+92", timezone: "Asia/Karachi", cities: ["Karachi", "Lahore", "Islamabad", "Rawalpindi"] },
  SA: { name: "Saudi Arabia", currency: "SAR", phoneCode: "+966", timezone: "Asia/Riyadh", cities: ["Jeddah", "Madinah", "Riyadh"] },
  AE: { name: "United Arab Emirates", currency: "AED", phoneCode: "+971", timezone: "Asia/Dubai", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  QA: { name: "Qatar", currency: "QAR", phoneCode: "+974", timezone: "Asia/Qatar", cities: ["Doha"] },
  CA: { name: "Canada", currency: "CAD", phoneCode: "+1", timezone: "America/Toronto", cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"] },
  US: { name: "United States", currency: "USD", phoneCode: "+1", timezone: "America/New_York", cities: ["New York", "Los Angeles", "Chicago", "Houston"] },
  DE: { name: "Germany", currency: "EUR", phoneCode: "+49", timezone: "Europe/Berlin", cities: ["Berlin", "Munich", "Hamburg"] },
  PL: { name: "Poland", currency: "PLN", phoneCode: "+48", timezone: "Europe/Warsaw", cities: ["Warsaw", "Krakow"] },
};

const STATE_TO_STATUS: Record<Exclude<CountryState, "off">, MarketStatus> = { waitlist: "WAITLIST", pilot: "PILOT", live: "LIVE" };

export function countryDefaults(code: string) {
  return COUNTRY_DEFAULTS[code.toUpperCase()] ?? null;
}

/** The current state of a country, read from its markets (the markets are what actually accept jobs). */
export function stateOf(markets: { enabled: boolean; status: MarketStatus }[]): CountryState {
  const on = markets.filter((m) => m.enabled);
  if (on.length === 0) return markets.length === 0 ? "off" : "off";
  if (on.some((m) => m.status === "LIVE")) return "live";
  if (on.some((m) => m.status === "PILOT")) return "pilot";
  return "waitlist";
}

/**
 * Applies a state to a country. Waitlist / Pilot / Live: every market of the country is enabled with that status (a country
 * with no market yet gets one covering its cities, with every service switched on). Off: every market is disabled.
 */
export async function setCountryState(countryCode: string, state: CountryState, opts: { cities?: string[] } = {}) {
  const code = countryCode.toUpperCase();
  const locale = await prisma.localeConfig.findUnique({ where: { countryCode: code } });
  const def = COUNTRY_DEFAULTS[code];
  const cities = (opts.cities?.length ? opts.cities : locale?.citiesLive.length ? locale.citiesLive : def?.cities ?? []).filter(Boolean);

  if (locale) {
    await prisma.localeConfig.update({
      where: { countryCode: code },
      data: { isLive: state === "live" || state === "pilot", marketStatus: state === "off" ? "hidden" : state, ...(opts.cities?.length ? { citiesLive: cities } : {}) },
    });
  }

  let markets = await prisma.market.findMany({ where: { countryCode: code } });
  if (state !== "off" && markets.length === 0) {
    const created = await prisma.market.create({
      data: {
        countryCode: code,
        name: locale?.countryName ?? def?.name ?? code,
        cities,
        enabled: false,
        status: "WAITLIST",
        currency: locale?.currency ?? def?.currency ?? "USD",
        phoneCode: def?.phoneCode ?? "+1",
        timezone: def?.timezone ?? "UTC",
        categories: { create: Object.values(Trade).map((trade) => ({ trade, enabled: true })) },
      },
    });
    markets = [created];
  }
  // A new city added in the quick panel joins the country's first market (it is a city list, not a zone).
  if (opts.cities?.length && markets.length > 0) {
    const first = markets[0];
    const merged = Array.from(new Set([...first.cities, ...opts.cities]));
    if (merged.length !== first.cities.length) await prisma.market.update({ where: { id: first.id }, data: { cities: merged } });
  }

  for (const m of markets) {
    await prisma.market.update({ where: { id: m.id }, data: state === "off" ? { enabled: false } : { enabled: true, status: STATE_TO_STATUS[state] } });
  }
  bustMarketCache();
  let activated = 0;
  let notified = 0;
  if (state === "pilot" || state === "live") {
    for (const m of markets) {
      activated += await activateWaitingForMarket(m.id).catch(() => 0);
      notified += await notifyWaitlistForMarket(m.id).catch(() => 0);
    }
  }
  return { markets: markets.length, activated, notified };
}
