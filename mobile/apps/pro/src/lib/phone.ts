// Phone validation for every phone input (redesign spec §5). Local Pakistani
// format only: 11 digits starting with 03 (e.g. 03076234578). Shared verbatim
// by apps/customer and apps/pro.

export const PHONE_EXAMPLE = "03076234578";

const LOCAL_RE = /^03\d{9}$/;

/**
 * Cleans a typed/pasted phone number and auto-converts an unambiguous
 * +92 / 0092 prefix to the local leading 0 (+923076234578 → 03076234578).
 * Spaces, dashes and brackets are stripped. Never throws.
 */
export function normalizePhone(input: string): string {
  let value = input.replace(/[\s\-().]/g, "");
  if (value.startsWith("+92")) value = `0${value.slice(3)}`;
  else if (value.startsWith("0092")) value = `0${value.slice(4)}`;
  return value;
}

export function isValidPhone(input: string): boolean {
  return LOCAL_RE.test(normalizePhone(input));
}
