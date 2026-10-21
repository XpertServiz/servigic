import { headers, cookies } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Currency } from "@prisma/client";
import type { Locale } from "@/i18n/request";
import { getVisitorGeo } from "@/lib/visitorGeo";

export interface MarketInfo {
  country: string; // ISO 3166-1 alpha-2
  countryName: string;
  currency: Currency;
  suggestedLocale: Locale;
  direction: "ltr" | "rtl";
  isLive: boolean;
  legalDisclaimer: string;
  paymentMethodsShown: string[];
  citiesLive: string[];
}

// Anything not in LocaleConfig (or if the table is somehow empty) falls
// back to Pakistan/PKR — this is still a Pakistan-first product; other
// markets are display-only until a real local launch (see GCC_EXPANSION.md).
const DEFAULT_MARKET: MarketInfo = {
  country: "PK",
  countryName: "Pakistan",
  currency: "PKR",
  suggestedLocale: "en",
  direction: "ltr",
  isLive: true,
  legalDisclaimer: "",
  paymentMethodsShown: ["JAZZCASH", "EASYPAISA", "BANK_TRANSFER"],
  citiesLive: ["Karachi", "Lahore", "Islamabad", "Rawalpindi"],
};

// LocaleConfig only changes when an admin edits it at /admin/locales, so
// there's no need to hit the DB on every page view — cached cross-request
// for 5 minutes (Geo-Localized Landing Page Addendum v5 §8: "zero API calls
// on the user-facing request path"), then deduped again within a single
// request via React's cache().
const getCachedLocaleConfigs = unstable_cache(async () => prisma.localeConfig.findMany(), ["locale-configs"], {
  revalidate: 300,
  tags: ["locale-configs"],
});
const getLocaleConfigs = cache(getCachedLocaleConfigs);

function toMarketInfo(row: Awaited<ReturnType<typeof getLocaleConfigs>>[number]): MarketInfo {
  return {
    country: row.countryCode,
    countryName: row.countryName,
    currency: row.currency,
    suggestedLocale: row.language as Locale,
    direction: row.direction === "rtl" ? "rtl" : "ltr",
    isLive: row.isLive,
    legalDisclaimer: row.legalDisclaimer,
    paymentMethodsShown: row.paymentMethodsShown,
    citiesLive: row.citiesLive,
  };
}

/**
 * Resolves the visitor's market (country/currency/suggested language/
 * live status/legal text), backed by the admin-editable LocaleConfig
 * table. Priority: manual cookie override (from the currency switcher) >
 * platform geo header (Vercel sets `x-vercel-ip-country` automatically in
 * production; not present on localhost or non-Vercel hosts) > Pakistan
 * default. Auto-detect only ever sets the default — the cookie override
 * always wins, so a wrong IP-geolocation guess never traps a visitor.
 */
export async function detectMarket(): Promise<MarketInfo> {
  const configs = await getLocaleConfigs();
  const byCode = new Map(configs.map((c) => [c.countryCode, c]));

  const cookieStore = await cookies();
  const overrideCountry = cookieStore.get("servigic_country")?.value;
  if (overrideCountry && byCode.has(overrideCountry)) {
    return toMarketInfo(byCode.get(overrideCountry)!);
  }

  const headerList = await headers();
  const geoCountry =
    headerList.get("x-vercel-ip-country") || // Vercel (production)
    headerList.get("cf-ipcountry") || // Cloudflare, if ever fronted by it
    null;

  if (geoCountry && byCode.has(geoCountry)) {
    return toMarketInfo(byCode.get(geoCountry)!);
  }

  const pk = byCode.get("PK");
  return pk ? toMarketInfo(pk) : DEFAULT_MARKET;
}

export async function listMarkets(): Promise<MarketInfo[]> {
  const configs = await getLocaleConfigs();
  return configs.map(toMarketInfo);
}

// ---------- the visitor's real country, for texts that name cities, ID documents and payment methods ----------

// A crawler has no useful IP: it reads the page in the language of the URL, so it gets that language's home country.
const LOCALE_HOME_COUNTRY: Record<string, string> = { ur: "PK", ar: "SA", de: "DE", pl: "PL", fr: "CA", es: "US", hi: "PK" };

export interface VisitorMarket {
  country: string; // ISO 3166-1 alpha-2 (the visitor's, or the language's home country for crawlers / unknown)
  isLive: boolean;
  citiesLive: string[];
  known: boolean; // false when we could not tell (local dev, privacy tools): defaults to Pakistan
  liveCountries: string[]; // every country that is live right now
}

/**
 * The visitor's country and whether Servigic is live there. Order: manual override cookie (country switcher) > the hosting
 * edge's IP-country header > for crawlers the language's home country > Pakistan. Pure reading of headers: no IP is stored.
 */
export async function detectVisitorMarket(locale: string): Promise<VisitorMarket> {
  const [configs, geo, cookieStore] = await Promise.all([getLocaleConfigs(), getVisitorGeo(), cookies()]);
  const byCode = new Map(configs.map((c) => [c.countryCode, c]));
  const override = (cookieStore.get("servigic_country")?.value ?? "").toUpperCase();
  let country: string | null = /^[A-Z]{2}$/.test(override) ? override : null;
  if (!country && !geo.isBot) country = geo.country;
  const known = Boolean(country);
  if (!country) country = LOCALE_HOME_COUNTRY[locale] ?? "PK";
  const cfg = byCode.get(country);
  return { country, isLive: Boolean(cfg?.isLive), citiesLive: cfg?.citiesLive ?? [], known, liveCountries: configs.filter((c) => c.isLive).map((c) => c.countryCode) };
}
