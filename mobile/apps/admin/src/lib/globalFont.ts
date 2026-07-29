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
// Only affects this app's native LoginScreen — AdminWebScreen is a WebView
// showing the web app, which already sets its own font via next/font.
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
