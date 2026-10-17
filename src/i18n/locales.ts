// Single source of truth for the website's languages. Pure data (no imports),
// so it is safe to use from the edge proxy, server components and client
// components alike. Adding a language = one entry here + one messages/<code>.json
// (any key missing from a catalog falls back to English automatically).
export interface LocaleMeta {
  code: string;
  /** Name in its own script — what the language switcher shows. */
  native: string;
  english: string;
  dir: "ltr" | "rtl";
  /** BCP-47 tag for hreflang / <html lang> region hints. */
  hreflang: string;
  /** Open Graph locale. */
  og: string;
}

export const LOCALES = [
  { code: "en", native: "English", english: "English", dir: "ltr", hreflang: "en", og: "en_US" },
  { code: "ur", native: "اردو", english: "Urdu", dir: "rtl", hreflang: "ur-PK", og: "ur_PK" },
  { code: "ar", native: "العربية", english: "Arabic", dir: "rtl", hreflang: "ar", og: "ar_SA" },
  { code: "de", native: "Deutsch", english: "German", dir: "ltr", hreflang: "de", og: "de_DE" },
  { code: "fr", native: "Français", english: "French", dir: "ltr", hreflang: "fr", og: "fr_FR" },
  { code: "es", native: "Español", english: "Spanish", dir: "ltr", hreflang: "es", og: "es_ES" },
  { code: "hi", native: "हिन्दी", english: "Hindi", dir: "ltr", hreflang: "hi", og: "hi_IN" },
  { code: "pl", native: "Polski", english: "Polish", dir: "ltr", hreflang: "pl", og: "pl_PL" },
  { code: "tr", native: "Türkçe", english: "Turkish", dir: "ltr", hreflang: "tr", og: "tr_TR" },
  { code: "it", native: "Italiano", english: "Italian", dir: "ltr", hreflang: "it", og: "it_IT" },
  { code: "pt", native: "Português", english: "Portuguese", dir: "ltr", hreflang: "pt", og: "pt_BR" },
  { code: "nl", native: "Nederlands", english: "Dutch", dir: "ltr", hreflang: "nl", og: "nl_NL" },
] as const satisfies readonly LocaleMeta[];

export type Locale = (typeof LOCALES)[number]["code"];
export const SUPPORTED_LOCALES = LOCALES.map((l) => l.code) as unknown as readonly [Locale, ...Locale[]];
export const DEFAULT_LOCALE: Locale = "en";
export const RTL_LOCALES: Locale[] = LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code);

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localeMeta(code: string): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

// Language suggested to a visitor from their country (the "View this page in …?" bar). It is only ever a suggestion:
// the page itself is never switched or redirected by IP. Everything not listed stays English.
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  PK: "ur",
  SA: "ar", AE: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar", EG: "ar", JO: "ar",
  DE: "de", AT: "de", CH: "de",
  FR: "fr", BE: "fr",
  ES: "es", MX: "es", AR: "es", CO: "es",
};

export function localeForCountry(country: string | null | undefined, region?: string | null): Locale {
  if (!country) return DEFAULT_LOCALE;
  const code = country.toUpperCase();
  if (code === "CA") return region?.toUpperCase() === "QC" ? "fr" : DEFAULT_LOCALE;
  return COUNTRY_TO_LOCALE[code] ?? DEFAULT_LOCALE;
}

// ─── URL helpers ───
// Marketing pages are reachable per language at /<code>/… (so Google can index
// each language); English lives at the unprefixed URL. App/auth routes are never
// prefixed — they follow the cookie / IP-detected language.
const MARKETING_PREFIXES = ["/how-it-works", "/pro", "/services", "/trust-and-safety", "/business", "/legal"];

export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALES.filter((l) => l.code !== "en").map((l) => l.code).join("|")})(?=/|$)`);

/** "/de/pro" → { locale: "de", path: "/pro" }; "/pro" → { locale: null, path: "/pro" }. */
export function splitLocalePath(pathname: string): { locale: Locale | null; path: string } {
  const m = pathname.match(LOCALE_PREFIX_RE);
  if (!m) return { locale: null, path: pathname };
  return { locale: m[1] as Locale, path: pathname.slice(m[0].length) || "/" };
}

/** Public URL path for a marketing page in a language ("/pro","de" → "/de/pro"). */
export function localizePath(path: string, locale: string): string {
  if (!isMarketingPath(path.split(/[?#]/)[0]) || locale === DEFAULT_LOCALE || !isLocale(locale)) return path;
  const hashIdx = path.search(/[?#]/);
  const base = hashIdx === -1 ? path : path.slice(0, hashIdx);
  const rest = hashIdx === -1 ? "" : path.slice(hashIdx);
  return `/${locale}${base === "/" ? "" : base}${rest}`;
}
