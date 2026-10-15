import { prisma } from "@/lib/prisma";
import { Trade } from "@prisma/client";
import { MarketsClient } from "./MarketsClient";
import { parsePolygons } from "@/lib/geofence";
import { cityCenter } from "@/lib/cityCenters";

export const dynamic = "force-dynamic";

// Demand by area and service: one row per (country, zone or "outside every zone", area, service, role).
function aggregateWaitlist(
  rows: { countryCode: string; zone: string | null; area: string | null; city: string | null; trade: string | null; role: string | null; notifiedAt: Date | null }[],
) {
  const map = new Map<string, { countryCode: string; zone: string | null; area: string | null; trade: string | null; role: string | null; count: number; notified: number }>();
  for (const w of rows) {
    const area = w.area ?? w.city ?? null;
    const key = [w.countryCode, w.zone ?? "", area ?? "", w.trade ?? "", w.role ?? ""].join("|");
    const row = map.get(key) ?? { countryCode: w.countryCode, zone: w.zone, area, trade: w.trade, role: w.role, count: 0, notified: 0 };
    row.count++;
    if (w.notifiedAt) row.notified++;
    map.set(key, row);
  }
  return Array.from(map.values());
}

export default async function AdminMarketsPage() {
  const [markets, waitlist, pros] = await Promise.all([
    prisma.market.findMany({ include: { categories: true }, orderBy: [{ countryCode: "asc" }, { name: "asc" }] }),
    prisma.countryWaitlistEntry.findMany({ select: { countryCode: true, zone: true, area: true, city: true, trade: true, role: true, notifiedAt: true, marketId: true }, take: 20000 }),
    prisma.providerProfile.findMany({ where: { OR: [{ isVerified: true }, { verificationLevel: { gte: 1 } }] }, select: { activation: true, trades: true, user: { select: { city: true } } } }),
  ]);

  const view = markets.map((m) => {
    const cities = new Set(m.cities.map((c) => c.toLowerCase()));
    const inMarket = pros.filter((p) => p.user.city && cities.has(p.user.city.toLowerCase()));
    const perTrade: Record<string, { active: number; waiting: number }> = {};
    for (const p of inMarket) {
      for (const t of p.trades) {
        const e = (perTrade[t] ??= { active: 0, waiting: 0 });
        if (p.activation === "ACTIVE") e.active++;
        else e.waiting++;
      }
    }
    return {
      id: m.id,
      countryCode: m.countryCode,
      name: m.name,
      cities: m.cities,
      enabled: m.enabled,
      status: m.status,
      currency: m.currency,
      phoneCode: m.phoneCode,
      timezone: m.timezone,
      polygons: parsePolygons(m.polygons),
      center: ((): [number, number] => {
        const c = m.cities.map((x) => cityCenter(x)).find(Boolean);
        return c ? [c.lat, c.lng] : [24.8607, 67.0011];
      })(),
      waiting: waitlist.filter((w) => w.marketId === m.id && !w.notifiedAt).length,
      activePros: inMarket.filter((p) => p.activation === "ACTIVE").length,
      waitingPros: inMarket.filter((p) => p.activation === "WAITING").length,
      categories: Object.fromEntries(m.categories.map((c) => [c.trade, { enabled: c.enabled, maxActivePros: c.maxActivePros }])),
      perTrade,
    };
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Markets &amp; Launch</h1>
      <p className="mb-8 max-w-3xl text-text-muted">
        One row per launch area. A market takes jobs only while it is <b>enabled</b> and its status is <b>Pilot</b> or{" "}
        <b>Live</b>. Switch trades on per market (e.g. Canada = Movers only) and cap how many <b>active</b> pros each trade
        may have; approved pros beyond the cap wait (&quot;Approved, waiting for jobs in your area&quot;) and are activated
        first-come-first-served as you raise the cap or open the market.
      </p>
      <MarketsClient
        markets={view}
        allTrades={Object.values(Trade)}
        waitlist={aggregateWaitlist(waitlist)}
      />
    </div>
  );
}
