import { Text, TextInput } from "react-native";

// Not wired up as a real npm workspace package — this file is duplicated
// verbatim in apps/customer, apps/pro, and apps/admin's src/lib/, matching
// the existing pattern for sound.ts/api.ts. If you change one, copy the
// change to the others.
//
// Sets Inter as the app-wide default font by overriding Text/TextInput's
// defaultProps once at startup, instead of touching every screen's inline
// style (there's no shared base Text component to edit centrally — every
// screen imports Text directly from react-native). Call once, after the
// font has finished loading via useFonts, before the app renders its tree.
//
// Screens already set fontWeight ("600"/"700"/"800") inline; since only the
// Regular weight is forced here, RN synthesizes bold from that single file
// for heavier weights. That's a deliberate trade-off — a pixel-perfect
// per-weight mapping would mean replacing every inline fontWeight with a
// matching Inter_XXXWeight fontFamily across dozens of screens.
type DefaultProps = { defaultProps?: { style?: unknown } };

export function applyGlobalFont(fontFamily = "Inter_400Regular") {
  const TextWithDefaults = Text as unknown as DefaultProps & { defaultProps: Record<string, unknown> };
  TextWithDefaults.defaultProps = {
    ...TextWithDefaults.defaultProps,
    style: [{ fontFamily }, TextWithDefaults.defaultProps?.style],
  };

  const TextInputWithDefaults = TextInput as unknown as DefaultProps & { defaultProps: Record<string, unknown> };
  TextInputWithDefaults.defaultProps = {
    ...TextInputWithDefaults.defaultProps,
    style: [{ fontFamily }, TextInputWithDefaults.defaultProps?.style],
  };
}
