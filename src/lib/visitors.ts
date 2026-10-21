import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// "Online now" = pinged within this window. The browser heartbeats every 45s,
// so 2 minutes tolerates one missed beat without flapping.
export const ONLINE_WINDOW_MS = 120_000;

export interface VisitorStats {
  online: number;
  today: number;
  total: number;
  pageViews: number;
  countries: { country: string; visitors: number; online: number; pageViews: number }[];
  updatedAt: string;
}

export const EMPTY_STATS: VisitorStats = { online: 0, today: 0, total: 0, pageViews: 0, countries: [], updatedAt: new Date(0).toISOString() };

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// The salt rotates daily, so a hash identifies "this browser today" and can
// never be joined to the same person on another day, or reversed to an IP.
function visitorHash(ip: string, userAgent: string, day: string): string {
  const secret = process.env.AUTH_SECRET || "servigic";
  return createHash("sha256").update(`${secret}|${day}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] || headers.get("x-real-ip") || "0.0.0.0").trim();
}

export function countryFromHeaders(headers: Headers): string {
  const c = (headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "").toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : "XX";
}

/** Records a heartbeat. `view` = a new page view (vs. a keep-alive ping). */
export async function recordVisit(headers: Headers, view: boolean): Promise<void> {
  const userAgent = headers.get("user-agent");
  if (isBot(userAgent)) return;
  const day = utcDay();
  const hash = visitorHash(clientIp(headers), userAgent ?? "", day);
  const country = countryFromHeaders(headers);
  await prisma.siteVisitor.upsert({
    where: { day_visitorHash: { day, visitorHash: hash } },
    create: { day, visitorHash: hash, country },
    update: { lastSeenAt: new Date(), ...(view ? { pageViews: { increment: 1 } } : {}) },
  });
}

export async function getVisitorStats(): Promise<VisitorStats> {
  try {
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [online, today, total, views, byCountry, onlineByCountry] = await Promise.all([
      prisma.siteVisitor.count({ where: { lastSeenAt: { gte: since } } }),
      prisma.siteVisitor.count({ where: { day: utcDay() } }),
      prisma.siteVisitor.count(),
      prisma.siteVisitor.aggregate({ _sum: { pageViews: true } }),
      prisma.siteVisitor.groupBy({ by: ["country"], _count: { _all: true }, _sum: { pageViews: true }, orderBy: { _count: { country: "desc" } }, take: 40 }),
      prisma.siteVisitor.groupBy({ by: ["country"], where: { lastSeenAt: { gte: since } }, _count: { _all: true } }),
    ]);
    const onlineMap = new Map(onlineByCountry.map((r) => [r.country, r._count._all]));
    return {
      online,
      today,
      total,
      pageViews: views._sum.pageViews ?? 0,
      countries: byCountry.map((r) => ({ country: r.country, visitors: r._count._all, online: onlineMap.get(r.country) ?? 0, pageViews: r._sum.pageViews ?? 0 })),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    // Table not migrated yet / DB unreachable — the landing page must still render.
    return EMPTY_STATS;
  }
}
