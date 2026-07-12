import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { detectMarket } from "@/lib/geoDetect";

export const SUPPORTED_LOCALES = ["en", "ur", "ar", "de", "fr", "pl"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const RTL_LOCALES: Locale[] = ["ar"];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("servigic_locale")?.value;

  let locale: Locale;
  if (SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    // No manual override yet — suggest a locale from the geo-detected
    // market (Geo-Localized Landing Page Addendum v5 §2: auto-detect only
    // ever sets the default; the language switcher's cookie always wins
    // on every subsequent visit, since IP geolocation is often wrong).
    const market = await detectMarket();
    locale = SUPPORTED_LOCALES.includes(market.suggestedLocale) ? market.suggestedLocale : DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
