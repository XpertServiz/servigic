import { cookies } from "next/headers";
import { DEFAULT_THEME, isThemeName, type ThemeName } from "@/lib/theme";

export async function getActiveTheme(): Promise<ThemeName> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("servigic_theme")?.value;
  if (cookieTheme && isThemeName(cookieTheme)) return cookieTheme;
  return DEFAULT_THEME;
}
