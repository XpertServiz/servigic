// Phone handling for every country (handoff spec §5). Numbers are validated
// with libphonenumber (the JS port of Google's library) and stored in E.164
// ("+923051234567"). Accounts created before this change may still hold the
// number in whatever form it was typed ("03001234567", "+92300…"), so lookups
// go through phoneVariants() instead of an exact match.
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/mobile";

// The product is Pakistan-first: a number typed without any country context
// (old app versions, the web form) is read as a Pakistani number.
export const DEFAULT_COUNTRY: CountryCode = "PK";

/** Cleans the input and turns a leading 00 (international call prefix) into +. */
function clean(input: string): string {
  const compact = input.trim().replace(/[\s\-().]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

/** The E.164 form of a valid number, or null if it isn't a valid number for the country. */
export function toE164(input: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const parsed = parsePhoneNumberFromString(clean(input), country);
  return parsed && parsed.isValid() ? parsed.number : null;
}

/**
 * The digits WhatsApp needs in a wa.me link (country code, no "+", no leading 0): "0334 0035233" -> "923340035233",
 * "+966 50 123 4567" -> "966501234567". A local number without a country code is read as Pakistani. Null if unusable.
 */
export function whatsappDigits(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const e164 = toE164(raw, "PK");
  if (e164) return e164.slice(1);
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 10 && !digits.startsWith("0") ? digits : null;
}

/** The ISO country of a number in international form ("+966..." -> "SA"), or null. */
export function countryOfPhone(e164: string | null | undefined): string | null {
  if (!e164) return null;
  return parsePhoneNumberFromString(clean(e164))?.country ?? null;
}

/** Every stored form this number could plausibly be saved under. */
export function phoneVariants(input: string, country: CountryCode = DEFAULT_COUNTRY): string[] {
  const raw = input.trim();
  const variants = new Set<string>([raw, clean(raw)]);
  const parsed = parsePhoneNumberFromString(clean(raw), country);
  if (parsed) {
    const e164 = parsed.number;
    variants.add(e164);
    variants.add(e164.slice(1));
    // Legacy local forms: Pakistani numbers were originally stored as 03XXXXXXXXX.
    if (parsed.countryCallingCode === "92") {
      const national = parsed.nationalNumber;
      variants.add(`0${national}`);
      variants.add(`0092${national}`);
    }
  }
  return Array.from(variants);
}
