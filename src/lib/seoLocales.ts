import { getMarkets, acceptsJobs } from "@/lib/marketConfig";

// Which language versions of a city's service pages are worth indexing. The same page in 12 languages for every city is
// 1,000+ near-identical URLs; Google parks most of them as "Discovered / Crawled - currently not indexed" and the site looks
// thin. Nobody searches for "idraulico Karachi", so a city page is indexed (and put in the sitemap and in hreflang) only in
// English plus the languages people in that country really use. The other language versions still work for anyone who opens
// them, but are marked noindex so they stop competing with the real pages.
const LANGS_BY_COUNTRY: Record<string, string[]> = {
  PK: ["en", "ur"],
  SA: ["en", "ar", "ur"],
  AE: ["en", "ar", "ur"],
  QA: ["en", "ar", "ur"],
  KW: ["en", "ar", "ur"],
  OM: ["en", "ar", "ur"],
  BH: ["en", "ar", "ur"],
  CA: ["en", "fr"],
  US: ["en", "es"],
  GB: ["en", "ur"],
  DE: ["en", "de"],
  PL: ["en", "pl"],
  FR: ["en", "fr"],
  ES: ["en", "es"],
  IT: ["en", "it"],
  NL: ["en", "nl"],
  PT: ["en", "pt"],
  TR: ["en", "tr"],
  IN: ["en", "hi"],
};

export function localesForCountry(country: string | null | undefined): string[] {
  return LANGS_BY_COUNTRY[(country ?? "").toUpperCase()] ?? ["en"];
}

/** City slug -> the country it is in, from the live markets. */
export async function cityCountryBySlug(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const m of (await getMarkets()).filter((x) => acceptsJobs(x))) {
    for (const city of m.cities) out.set(city.toLowerCase().replace(/\s+/g, "-"), m.countryCode);
  }
  return out;
}
