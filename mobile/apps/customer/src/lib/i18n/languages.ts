// Languages the app can show, each in its own native script. Must stay in sync
// with the backend's Language enum / SUPPORTED_LOCALES (prisma/schema.prisma,
// src/app/api/mobile/me/route.ts) — that is what the chosen language is persisted to.
// Shared verbatim by apps/customer and apps/pro.
export const LANGUAGES = [
  { code: "en", native: "English", english: "English", rtl: false },
  { code: "ur", native: "اردو", english: "Urdu", rtl: true },
  { code: "ar", native: "العربية", english: "Arabic", rtl: true },
  { code: "de", native: "Deutsch", english: "German", rtl: false },
  { code: "fr", native: "Français", english: "French", rtl: false },
  { code: "es", native: "Español", english: "Spanish", rtl: false },
  { code: "hi", native: "हिन्दी", english: "Hindi", rtl: false },
  { code: "pl", native: "Polski", english: "Polish", rtl: false },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: LangCode = "en";

export function isLangCode(value: unknown): value is LangCode {
  return LANGUAGES.some((l) => l.code === value);
}

export function isRtlLang(code: LangCode): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false;
}
