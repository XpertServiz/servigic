import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/landing/Eyebrow";

const TRADE_ICONS: Record<string, string> = {
  PLUMBER: "🔧",
  ELECTRICIAN: "💡",
  AC_TECHNICIAN: "❄️",
  SOLAR_INSTALLER: "☀️",
  CARPENTER: "🪚",
  PAINTER: "🎨",
  APPLIANCE_REPAIR: "🧺",
  CAR_MECHANIC: "🚗",
  MOVERS: "📦",
  CLEANER: "🧹",
  MASON: "🧱",
  HANDYMAN: "🛠️",
};

const FALLBACK = [
  { trade: "PLUMBER", name: "Plumber", slug: "plumber", minPricePKR: 1200 },
  { trade: "ELECTRICIAN", name: "Electrician", slug: "electrician", minPricePKR: 1000 },
  { trade: "AC_TECHNICIAN", name: "AC Technician", slug: "ac-technician", minPricePKR: 1800 },
  { trade: "SOLAR_INSTALLER", name: "Solar Installer", slug: "solar-installer", minPricePKR: 8500 },
  { trade: "CARPENTER", name: "Carpenter", slug: "carpenter", minPricePKR: 1500 },
  { trade: "PAINTER", name: "Painter", slug: "painter", minPricePKR: 3000 },
  { trade: "APPLIANCE_REPAIR", name: "Appliance Repair", slug: "appliance-repair", minPricePKR: 1400 },
  { trade: "CAR_MECHANIC", name: "Car Mechanic", slug: "car-mechanic", minPricePKR: 1600 },
  { trade: "MOVERS", name: "Movers", slug: "movers", minPricePKR: 4000 },
  { trade: "CLEANER", name: "Cleaner", slug: "cleaner", minPricePKR: 1800 },
  { trade: "MASON", name: "Mason", slug: "mason", minPricePKR: 2200 },
  { trade: "HANDYMAN", name: "Handyman", slug: "handyman", minPricePKR: 900 },
];

async function getCategories() {
  try {
    const categories = await prisma.serviceCategory.findMany({ orderBy: { name: "asc" } });
    if (categories.length === 0) return FALLBACK;
    return categories;
  } catch {
    return FALLBACK;
  }
}

export async function ServicesGrid() {
  const categories = await getCategories();
  const defaultCity = "karachi";

  return (
    <section id="services" className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>Services</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">12 TRADES. ONE APP.</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.trade}
            href={`/services/${c.slug}/${defaultCity}`}
            className="rounded-xl border border-border-subtle bg-bg-elevated p-5.5 transition-all hover:-translate-y-0.5 hover:border-accent"
          >
            <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent/10 text-lg text-accent">
              {TRADE_ICONS[c.trade] ?? "🛠️"}
            </div>
            <h4 className="text-[15px] font-bold">{c.name}</h4>
            <small className="text-xs text-text-dim text-text-muted">
              {c.minPricePKR ? `From PKR ${c.minPricePKR.toLocaleString()}` : "See pricing"}
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}
