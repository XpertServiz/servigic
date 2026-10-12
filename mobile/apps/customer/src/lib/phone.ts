// International phone numbers (redesign spec §5). Validation and formatting use
// libphonenumber (libphonenumber-js, the JS port of Google's library) — no
// hand-written per-country regexes. Numbers are sent to the server in E.164.
// Shared verbatim by apps/customer and apps/pro.
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode, getExampleNumber, type CountryCode } from "libphonenumber-js/mobile";
import examples from "libphonenumber-js/examples.mobile.json";
import { getLocales } from "expo-localization";

export type { CountryCode };

// The product is Pakistan-first: the last-resort default when neither the
// server's geo hint nor the device region is known.
export const FALLBACK_COUNTRY: CountryCode = "PK";

export interface Country {
  code: CountryCode;
  dial: string; // "+92"
  flag: string; // emoji
  name: string;
}

export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

let regionNames: { of: (code: string) => string | undefined } | null | undefined;
function countryName(code: string): string {
  if (regionNames === undefined) {
    try {
      const IntlAny = Intl as unknown as { DisplayNames?: new (l: string[], o: { type: string }) => { of: (c: string) => string | undefined } };
      regionNames = IntlAny.DisplayNames ? new IntlAny.DisplayNames(["en"], { type: "region" }) : null;
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

let cached: Country[] | null = null;
export function allCountries(): Country[] {
  cached ??= getCountries()
    .map((code) => ({ code, dial: `+${getCountryCallingCode(code)}`, flag: flagEmoji(code), name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cached;
}

export function countryByCode(code: string | null | undefined): Country | undefined {
  return allCountries().find((c) => c.code === code);
}

/** Picker default: the server's geo suggestion → the device region → Pakistan. A suggestion, never a lock. */
export function defaultCountry(geoCountry?: string | null): CountryCode {
  if (geoCountry && countryByCode(geoCountry)) return geoCountry as CountryCode;
  try {
    const region = getLocales()[0]?.regionCode;
    if (region && countryByCode(region)) return region as CountryCode;
  } catch {}
  return FALLBACK_COUNTRY;
}

/** A valid example number for the country, for the placeholder and the error message. */
export function exampleFor(country: CountryCode): { national: string; international: string } {
  const sample = getExampleNumber(country, examples);
  return {
    national: sample?.formatNational() ?? "",
    international: sample?.formatInternational() ?? `+${getCountryCallingCode(country)}`,
  };
}

export interface ParsedPhone {
  e164: string | null;
  valid: boolean;
  /** Country the number actually belongs to when the user typed an international number. */
  detectedCountry?: CountryCode;
  national?: string;
}

/**
 * Normalises what was typed and validates it for the selected country. A
 * leading 00 is read as + (0092… → +92…), a redundant national 0 is handled by
 * libphonenumber, and a number typed with its own +code wins over the picker.
 */
export function parsePhone(input: string, country: CountryCode): ParsedPhone {
  let value = input.trim().replace(/[\s\-().]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  const parsed = value ? parsePhoneNumberFromString(value, country) : undefined;
  if (!parsed || !parsed.isValid()) return { e164: null, valid: false };
  return { e164: parsed.number, valid: true, detectedCountry: parsed.country, national: parsed.formatNational() };
}
