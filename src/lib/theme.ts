export const THEME_PRESETS = {
  "electric-amber": {
    label: "Electric Amber",
    description: "Servigic default — tool/energy urgency",
    accent: "#FFB020",
  },
  "ocean-blue": {
    label: "Ocean Blue",
    description: "Calm, trust-forward alternative",
    accent: "#3B82F6",
  },
  "crimson-pulse": {
    label: "Crimson Pulse",
    description: "High-urgency, emergency-dispatch feel",
    accent: "#FB4141",
  },
  "violet-nova": {
    label: "Violet Nova",
    description: "Premium, GCC-market alternative",
    accent: "#A855F7",
  },
} as const;

export type ThemeName = keyof typeof THEME_PRESETS;

export const DEFAULT_THEME: ThemeName = "electric-amber";

export function isThemeName(value: string): value is ThemeName {
  return value in THEME_PRESETS;
}
