import type { Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMarkets, marketForPoint, type MarketSnapshot } from "@/lib/marketConfig";
import { loadAreas, matchAreaByText } from "@/lib/areas";

// Zone dashboard numbers: per zone x trade the recruiting funnel against the target, and (once jobs flow) the
// Phase-1 gate metrics. Colours compare against these targets; they are defaults, not hard rules.
export const TARGETS = { bidWithin15MinPct: 80, jobsPerActiveProPerWeek: 3, completionPct: 80, ratingAvg: 4.5 };
const CONTACTED = ["CONTACTED", "INTERESTED", "INVITED", "CALLBACK", "NOT_INTERESTED", "REGISTERED", "ONBOARDED", "VERIFIED", "ACTIVE"];
const INTERESTED = ["INTERESTED", "INVITED", "REGISTERED", "ONBOARDED", "VERIFIED", "ACTIVE"];
const REGISTERED = ["REGISTERED", "ONBOARDED", "VERIFIED", "ACTIVE"];
const VERIFIED = ["VERIFIED", "ACTIVE"];

export type Tone = "green" | "amber" | "red" | "none";
export const toneFor = (value: number | null, target: number, lowerIsBetter = false): Tone => {
  if (value == null) return "none";
  const ratio = lowerIsBetter ? target / Math.max(value, 0.0001) : value / target;
  return ratio >= 1 ? "green" : ratio >= 0.5 ? "amber" : "red";
};

export interface TradeRow {
  trade: string;
  target: number;
  leads: number;
  contacted: number;
  interested: number;
  registered: number;
  verified: number;
  activePros: number;
  tone: Tone;
}
export interface ZoneStat {
  zone: MarketSnapshot;
  rows: TradeRow[];
  gate: { jobs30: number; bid15Pct: number | null; jobsPerProWeek: number | null; completionPct: number | null; ratingAvg: number | null; activePros: number };
}

export async function zoneStats(): Promise<{ zones: ZoneStat[]; foundingLeft: number; foundingSlots: number }> {
  const markets = await getMarkets({ fresh: true });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [cats, leads, pros, jobs, settings, foundingUsed] = await Promise.all([
    prisma.marketCategory.findMany(),
    prisma.lead.findMany({ select: { zoneId: true, status: true, trades: true, trade: true, lastContactedAt: true } }),
    prisma.providerProfile.findMany({
      where: { isVerified: true, activation: "ACTIVE" },
      select: { trades: true, baseLat: true, baseLng: true, ratingAvg: true, ratingCount: true, user: { select: { city: true } } },
    }),
    prisma.job.findMany({
      where: { createdAt: { gte: since } },
      select: { lat: true, lng: true, city: true, createdAt: true, status: true, bids: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 }, booking: { select: { status: true } } },
    }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.providerProfile.count({ where: { foundingUntil: { not: null } } }),
  ]);

  const zoneOfPro = (p: (typeof pros)[number]) => marketForPoint(markets, p.baseLat != null && p.baseLng != null ? { lat: p.baseLat, lng: p.baseLng } : { lat: 0, lng: 0 }, p.user.city)?.id;

  const zones: ZoneStat[] = markets.map((zone) => {
    const tradesHere = cats.filter((c) => c.marketId === zone.id && c.enabled);
    const zoneLeads = leads.filter((l) => l.zoneId === zone.id);
    const zonePros = pros.filter((p) => zoneOfPro(p) === zone.id);
    const rows: TradeRow[] = tradesHere.map((c) => {
      const t = c.trade as Trade;
      const has = (l: (typeof leads)[number]) => l.trades.includes(t) || (l.trades.length === 0 && l.trade === t);
      const tl = zoneLeads.filter(has);
      const active = zonePros.filter((p) => p.trades.includes(t)).length;
      return {
        trade: c.trade,
        target: c.targetPros,
        leads: tl.length,
        contacted: tl.filter((l) => CONTACTED.includes(l.status) || l.lastContactedAt).length,
        interested: tl.filter((l) => INTERESTED.includes(l.status)).length,
        registered: tl.filter((l) => REGISTERED.includes(l.status)).length,
        verified: tl.filter((l) => VERIFIED.includes(l.status)).length,
        activePros: active,
        tone: toneFor(active, c.targetPros),
      };
    });

    const zoneJobs = jobs.filter((j) => marketForPoint(markets, { lat: j.lat, lng: j.lng }, j.city)?.id === zone.id);
    const withBid = zoneJobs.filter((j) => j.bids.length > 0);
    const fast = withBid.filter((j) => j.bids[0].createdAt.getTime() - j.createdAt.getTime() <= 15 * 60 * 1000).length;
    const done = zoneJobs.filter((j) => j.status === "COMPLETED" || j.booking?.status === "COMPLETED").length;
    const rated = zonePros.filter((p) => p.ratingCount > 0);
    return {
      zone,
      rows,
      gate: {
        jobs30: zoneJobs.length,
        bid15Pct: zoneJobs.length ? Math.round((fast / zoneJobs.length) * 100) : null,
        jobsPerProWeek: zonePros.length ? Math.round((zoneJobs.length / zonePros.length / (30 / 7)) * 10) / 10 : null,
        completionPct: zoneJobs.length ? Math.round((done / zoneJobs.length) * 100) : null,
        ratingAvg: rated.length ? Math.round((rated.reduce((s, p) => s + p.ratingAvg, 0) / rated.length) * 10) / 10 : null,
        activePros: zonePros.length,
      },
    };
  });
  const slots = settings?.foundingProSlots ?? 100;
  return { zones, foundingLeft: Math.max(0, slots - foundingUsed), foundingSlots: slots };
}

/** Waitlist demand: customer and Pro early-list counts by country -> city -> area (used to choose the next zone). */
export async function waitlistDemand() {
  const [areas, signups, outOfZone] = await Promise.all([
    loadAreas(),
    prisma.waitlistSignup.findMany({ select: { role: true, countryCode: true, city: true, area: true } }),
    prisma.countryWaitlistEntry.findMany({ select: { role: true, countryCode: true, city: true, area: true } }),
  ]);
  const map = new Map<string, { country: string; city: string; area: string; customers: number; pros: number }>();
  const add = (role: string | null, country: string, city: string | null, area: string | null) => {
    const matched = matchAreaByText(area, areas);
    const c = matched?.cityName ?? (city || "—");
    const a = matched?.name ?? (area || "—");
    const key = `${country}|${c}|${a}`;
    const e = map.get(key) ?? { country, city: c, area: a, customers: 0, pros: 0 };
    if (role === "PROVIDER" || role === "PRO") e.pros++;
    else e.customers++;
    map.set(key, e);
  };
  for (const s of signups) add(s.role, s.countryCode, s.city, s.area);
  for (const s of outOfZone) add(s.role, s.countryCode, s.city, s.area);
  return [...map.values()].sort((x, y) => y.customers + y.pros - (x.customers + x.pros));
}
