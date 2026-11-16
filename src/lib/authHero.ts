// Which sign-in picture to show: a static, pre-sized file in public/auth-heroes (served by the CDN, no server work per view).
// Credits: public/auth-heroes/CREDITS.md. Add a country by adding CC.webp (1080x1200) and listing it here.
const COUNTRY_HEROES = ["PK", "SA", "US", "CA"];
const CITY_HEROES: Record<string, string> = { "PK:karachi": "PK-karachi" };

/** "PK-karachi", "PK", ... or null (no picture for this country yet: the screens keep the dark background). */
export function authHeroFor(country: string, city?: string | null): string | null {
  const cc = (country || "").toUpperCase();
  const c = (city || "").trim().toLowerCase();
  return CITY_HEROES[`${cc}:${c}`] ?? (COUNTRY_HEROES.includes(cc) ? cc : null);
}
