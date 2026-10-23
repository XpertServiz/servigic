import { Text, TextInput } from "react-native";

// Not wired up as a real npm workspace package — this file is duplicated
// verbatim in apps/customer, apps/pro, and apps/admin's src/lib/, matching
// the existing pattern for sound.ts/api.ts. If you change one, copy the
// change to the others.
//
// Sets the app-wide default font by overriding Text/TextInput's defaultProps,
// instead of touching every screen's inline style (there's no shared base Text
// component to edit centrally — every screen imports Text directly from
// react-native). The font follows the app language: Inter has no Urdu, Arabic
// or Hindi letters, so those languages get their own proper script fonts:
//   Urdu   → Noto Nastaliq Urdu (Nastaliq, the style Urdu readers expect, like Jameel Noori Nastaleeq)
//   Arabic → Cairo (a clean modern Arabic face, common in Gulf apps)
//   Hindi  → Noto Sans Devanagari
// The i18n provider calls applyGlobalFont(fontForLang(lang)) whenever the language changes.
//
// Screens already set fontWeight ("600"/"700"/"800") inline; since only the
// Regular weight is forced here, RN synthesizes bold from that single file
// for heavier weights.
type DefaultProps = { defaultProps?: { style?: unknown } };

export function fontForLang(lang: string): string {
  if (lang === "ur") return "NotoNastaliqUrdu_400Regular";
  if (lang === "ar") return "Cairo_400Regular";
  if (lang === "hi") return "NotoSansDevanagari_400Regular";
  return "Inter_400Regular";
}

// The style each component had before we touched it, so switching language replaces the font instead of stacking.
let baseText: unknown;
let baseInput: unknown;
let captured = false;

export function applyGlobalFont(fontFamily = "Inter_400Regular") {
  const TextWithDefaults = Text as unknown as DefaultProps & { defaultProps: Record<string, unknown> };
  const TextInputWithDefaults = TextInput as unknown as DefaultProps & { defaultProps: Record<string, unknown> };
  if (!captured) {
    baseText = TextWithDefaults.defaultProps?.style;
    baseInput = TextInputWithDefaults.defaultProps?.style;
    captured = true;
  }
  TextWithDefaults.defaultProps = { ...TextWithDefaults.defaultProps, style: [{ fontFamily }, baseText] };
  TextInputWithDefaults.defaultProps = { ...TextInputWithDefaults.defaultProps, style: [{ fontFamily }, baseInput] };
}
