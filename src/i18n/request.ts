import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, RTL_LOCALES, type Locale } from "./locales";

type Messages = Record<string, unknown>;

function isPlainObject(v: unknown): v is Messages {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Any key a translation is missing falls back to English, so a half-finished
// catalog never renders a raw key or crashes a page.
function deepMerge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k] as Messages, v) : v;
  }
  return out;
}

/**
 * Picks the language for this request. Order:
 *  1. `x-servigic-locale` - set by the proxy when the URL carries a language prefix (/de/pro)
 *  2. `servigic_locale` cookie - the visitor's explicit choice (switcher or suggestion bar)
 *  3. English
 * The visitor's country never changes the page by itself (no IP redirects, crawlers always get the URL's own
 * language); it only drives the "View this page in …?" suggestion bar.
 */
export async function resolveLocale(): Promise<Locale> {
  const headerList = await headers();
  const fromUrl = headerList.get("x-servigic-locale");
  if (isLocale(fromUrl)) return fromUrl;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("servigic_locale")?.value;
  if (isLocale(fromCookie)) return fromCookie;

  return DEFAULT_LOCALE;
}

async function loadMessages(locale: Locale): Promise<Messages> {
  const en = (await import("../../messages/en.json")).default as Messages;
  if (locale === "en") return en;
  try {
    const localized = (await import(`../../messages/${locale}.json`)).default as Messages;
    return deepMerge(en, localized);
  } catch {
    return en;
  }
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return { locale, messages: await loadMessages(locale) };
});
