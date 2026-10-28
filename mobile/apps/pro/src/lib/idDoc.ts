import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

// Which identity document a pro is asked for, by his country: Pakistan CNIC, Saudi Arabia Iqama / National ID, Western countries
// the driving licence, anywhere else the national ID card. The sign-up screen uses the country of the phone number.
export type IdDocKind = "cnic" | "iqama" | "licence" | "id";

const WESTERN = new Set(["US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "PL", "PT", "SE", "NO", "DK", "FI", "BE", "AT", "CH", "GR", "CZ", "HU", "RO", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "LU", "IS", "MT", "CY"]);

export function idDocKind(country?: string | null): IdDocKind {
  const c = (country ?? "").toUpperCase();
  if (c === "PK") return "cnic";
  if (c === "SA") return "iqama";
  if (WESTERN.has(c)) return "licence";
  return "id";
}

export function countryFromPhone(phone?: string | null): string | null {
  return (phone && parsePhoneNumberFromString(phone)?.country) || null;
}
