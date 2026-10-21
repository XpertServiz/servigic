import { getLocale } from "next-intl/server";
import { getPrelaunchPublic } from "@/lib/prelaunchPublic";
import { getVisitorGeo } from "@/lib/visitorGeo";
import { detectVisitorMarket } from "@/lib/geoDetect";
import { cookies } from "next/headers";
import { localeForCountry, localeMeta, type Locale } from "@/i18n/locales";
import { WaitlistProvider } from "./WaitlistProvider";
import { TopBars, type BarsProps } from "./TopBars";

/**
 * Wraps the whole site: provides the waitlist popup, and works out what the top strip should say for this visitor.
 * The visitor's country only chooses the banner wording and a language *suggestion* - the page is never switched.
 */
export async function PrelaunchShell({ children }: { children: React.ReactNode }) {
  const [config, geo, locale, cookieStore] = await Promise.all([getPrelaunchPublic(), getVisitorGeo(), getLocale() as Promise<Locale>, cookies()]);

  // Unknown country (local dev, privacy tools): treat the visitor as being in the launch country.
  // The country comes from the same source as the rest of the page (country page, switcher cookie, IP), and the city names
  // are that country's own (Jeddah & Madinah for Saudi Arabia, Karachi / Lahore for Pakistan), never another market's.
  const vm = await detectVisitorMarket(locale);
  const country = vm.country;
  const ownCities = vm.citiesLive.slice(0, 2).join(" & ");
  const city = ownCities || (country === "PK" ? config.foundingCity || "Karachi" : "");
  let countryName = country;
  try {
    countryName = new Intl.DisplayNames([locale], { type: "region" }).of(country) ?? country;
  } catch {
    /* keep the code */
  }
  // A country that is open gets the launch-soon / live banner with its own cities; any other country is invited to join the list.
  const mode: BarsProps["mode"] = vm.isLive && city ? (config.customerAppLive ? "live" : "pk") : "other";

  // Suggest another language only to people who have not chosen one, and never to crawlers.
  let suggestion: BarsProps["suggestion"] = null;
  const suggested = localeForCountry(geo.country, geo.region);
  if (!geo.isBot && suggested !== locale && !cookieStore.get("servigic_locale")) {
    const meta = localeMeta(suggested);
    const messages = (await import(`../../../messages/${suggested}.json`)).default as { prelaunch?: { suggest_language?: string } };
    const template = messages.prelaunch?.suggest_language;
    if (template) suggestion = { code: suggested, native: meta.native, text: template.replace("{language}", meta.native) };
  }

  return (
    <WaitlistProvider config={config} detectedCountry={geo.country}>
      <TopBars mode={mode} city={city} countryName={countryName} suggestion={suggestion} />
      {children}
    </WaitlistProvider>
  );
}
