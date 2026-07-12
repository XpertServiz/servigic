import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, isThemeName, type ThemeName } from "@/lib/theme";

// Global theme, read from SiteSettings on every request (BanquetBid pattern) —
// switching in /admin/settings applies to every visitor immediately, no cookie.
export async function getActiveTheme(): Promise<ThemeName> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (settings?.activeTheme && isThemeName(settings.activeTheme)) return settings.activeTheme;
  } catch {
    // DB unreachable (e.g. build-time prerender probe) — fall back to default.
  }
  return DEFAULT_THEME;
}
