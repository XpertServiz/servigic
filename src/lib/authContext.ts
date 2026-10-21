import { prisma } from "@/lib/prisma";
import { detectVisitorMarket } from "@/lib/geoDetect";
import { PROFILES, cityName, profileFor } from "@/lib/countryProfile";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js/mobile";

// What the website's sign-up / login / reset forms need to know about the visitor's country: which country is
// pre-selected, the phone example for it, the cities to pick from, and the list of other countries offered.
export interface AuthCountry {
  code: string;
  name: string;
  dial: string; // "+966"
  phoneExample: string;
  cities: string[]; // empty = ask for the city as free text
}
export interface AuthContext {
  selected: string;
  countries: AuthCountry[];
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function dialOf(code: string): string {
  try {
    return `+${getCountryCallingCode(code as CountryCode)}`;
  } catch {
    return "";
  }
}

export async function getAuthContext(locale: string): Promise<AuthContext> {
  const [vm, configs, markets] = await Promise.all([
    detectVisitorMarket(locale),
    prisma.localeConfig.findMany({ orderBy: { countryName: "asc" } }).catch(() => []),
    prisma.market.findMany({ where: { enabled: true }, select: { countryCode: true, cities: true } }).catch(() => []),
  ]);

  const codes = new Set<string>([...configs.map((c) => c.countryCode), ...Object.keys(PROFILES)]);
  if (vm.country) codes.add(vm.country);

  const countries: AuthCountry[] = [...codes].map((code) => {
    const cfg = configs.find((c) => c.countryCode === code);
    const fromMarkets = markets.filter((m) => m.countryCode === code).flatMap((m) => m.cities);
    const cities = Array.from(new Set(fromMarkets.length ? fromMarkets : cfg?.citiesLive?.length ? cfg.citiesLive : profileFor(code).cities));
    return {
      code,
      name: regionName(code, locale),
      dial: dialOf(code),
      phoneExample: profileFor(code).phoneExample,
      cities: cities.map((c) => c),
    };
  });
  countries.sort((a, b) => a.name.localeCompare(b.name, locale));
  return { selected: vm.country, countries };
}

export { cityName };
