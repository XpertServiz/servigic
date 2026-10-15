import { LIVE_CITIES } from "@/lib/markets";

// Static service catalog: used for the /services index, the sitemap and as a
// fallback when the DB has no categories yet. Slugs match ServiceCategory.slug.
export const SERVICE_CATALOG = [
  { trade: "PLUMBER", slug: "plumber", icon: "🔧", minPricePKR: 1200 },
  { trade: "ELECTRICIAN", slug: "electrician", icon: "💡", minPricePKR: 1000 },
  { trade: "AC_TECHNICIAN", slug: "ac-technician", icon: "❄️", minPricePKR: 1800 },
  { trade: "SOLAR_INSTALLER", slug: "solar-installer", icon: "☀️", minPricePKR: 8500 },
  { trade: "CARPENTER", slug: "carpenter", icon: "🪚", minPricePKR: 1500 },
  { trade: "PAINTER", slug: "painter", icon: "🎨", minPricePKR: 3000 },
  { trade: "APPLIANCE_REPAIR", slug: "appliance-repair", icon: "🧺", minPricePKR: 1400 },
  { trade: "CAR_MECHANIC", slug: "car-mechanic", icon: "🚗", minPricePKR: 1600 },
  { trade: "MOVERS", slug: "movers", icon: "📦", minPricePKR: 4000 },
  { trade: "CLEANER", slug: "cleaner", icon: "🧹", minPricePKR: 1800 },
  { trade: "MASON", slug: "mason", icon: "🧱", minPricePKR: 2200 },
  { trade: "HANDYMAN", slug: "handyman", icon: "🛠️", minPricePKR: 900 },
] as const;

export const TRADE_ICONS: Record<string, string> = Object.fromEntries(SERVICE_CATALOG.map((s) => [s.trade, s.icon]));

export const CITY_SLUGS = LIVE_CITIES.map((c) => ({ name: c, slug: c.toLowerCase() }));

export function slugToCity(slug: string): string | null {
  return CITY_SLUGS.find((c) => c.slug === slug.toLowerCase())?.name ?? null;
}
