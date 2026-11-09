import { getSiteSettingsPublic } from "@/lib/publicData";
import { DEFAULT_THEME, isThemeName, type ThemeName } from "@/lib/theme";

// Global theme, read from SiteSettings on every request (BanquetBid pattern) —
// switching in /admin/settings applies to every visitor at once (the cached copy is refreshed on save), no cookie.
export async function getActiveTheme(): Promise<ThemeName> {
  try {
    const settings = await getSiteSettingsPublic();
    if (settings?.activeTheme && isThemeName(settings.activeTheme)) return settings.activeTheme;
  } catch {
    // DB unreachable (e.g. build-time prerender probe) — fall back to default.
  }
  return DEFAULT_THEME;
}
