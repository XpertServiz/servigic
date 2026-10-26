import { prisma } from "@/lib/prisma";
import { isAvailable } from "@/lib/availability";
import { notify } from "@/lib/notify";
import { haversineKm } from "@/lib/geo";
import { getMarkets, marketForCity, marketForPoint, acceptsJobs, tradeEnabled, type MarketSnapshot } from "@/lib/marketConfig";
import type { Job } from "@prisma/client";
import { hasLateCancelPenalty } from "@/lib/cancelFee";
import { alertEmailsLeft, recentEmailCounts, EMAIL_PER_PRO_PER_DAY } from "@/lib/emailBudget";

// Rewarded-ad perk (ProviderProfile.visibilityBoostUntil): while active, a
// pro's effective service radius is widened by this factor.
export const BOOST_RADIUS_MULTIPLIER = 1.3;

export type RadiusLimits = { min: number; max: number };
export const DEFAULT_RADIUS_LIMITS: RadiusLimits = { min: 2, max: 30 };

/** Radius limits for a place: the global settings, with the zone's own maximum when the admin set one (Markets & Launch). */
export function radiusLimitsFor(settings: { proRadiusMinKm?: number | null; proRadiusMaxKm?: number | null } | null | undefined, markets: MarketSnapshot[], city: string | null | undefined): RadiusLimits {
  const market = city ? marketForCity(markets, city) : null;
  return { min: settings?.proRadiusMinKm ?? 2, max: market?.proRadiusMaxKm ?? settings?.proRadiusMaxKm ?? 30 };
}

/** A pro's radius always sits inside the admin limits (older pros saved up to 50 km before the limits existed). */
export function clampRadiusKm(km: number, limits: RadiusLimits = DEFAULT_RADIUS_LIMITS): number {
  return Math.min(limits.max, Math.max(limits.min, km));
}

export function effectiveRadiusKm(provider: { serviceRadiusKm: number; visibilityBoostUntil: Date | null }, limits: RadiusLimits = DEFAULT_RADIUS_LIMITS): number {
  const boosted = provider.visibilityBoostUntil && provider.visibilityBoostUntil.getTime() > Date.now();
  const base = clampRadiusKm(provider.serviceRadiusKm, limits);
  return boosted ? base * BOOST_RADIUS_MULTIPLIER : base;
}

/**
 * Is this job inside an ACTIVE service zone, for a service that is switched on there? A job outside is never
 * sent to anyone, whatever the pro radius (a zone can be switched off after the job was posted). With no zones
 * configured at all the platform behaves as before (open).
 */
export function jobInActiveZone(markets: MarketSnapshot[], job: { lat: number; lng: number; city: string }, trade: string): boolean {
  if (markets.length === 0) return true;
  const zone = marketForPoint(markets, { lat: job.lat, lng: job.lng }, job.city);
  return acceptsJobs(zone) && tradeEnabled(zone, trade);
}

/** A live position older than this is ignored (the app sends one every few minutes while the pro is online). */
export const LIVE_LOCATION_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export function liveSpot(p: { liveLat?: number | null; liveLng?: number | null; liveAt?: Date | null }, now = Date.now()): { lat: number; lng: number } | null {
  if (p.liveLat == null || p.liveLng == null || !p.liveAt) return null;
  return now - p.liveAt.getTime() <= LIVE_LOCATION_MAX_AGE_MS ? { lat: p.liveLat, lng: p.liveLng } : null;
}

export type ServeVerdict = { ok: true } | { ok: false; code: "TRADE" | "NO_ZONE" | "OTHER_COUNTRY" | "OUT_OF_AREA"; message: string };

/**
 * Can this pro take this job at all? The rule behind the feed, the alerts, the job page and the bid button, so they can never
 * disagree: the pro offers the trade; the job is inside a live zone where that trade is on; the job is in the pro's own COUNTRY
 * (a Saudi pro never bids on a Pakistani customer, whatever his city says); and, once he has set his work location, inside his
 * service radius. Without a work location the country is judged from his registered city, then from where the request comes from.
 */
export function proServesJob(
  input: {
    provider: { trades: string[]; baseLat: number | null; baseLng: number | null; serviceRadiusKm: number; visibilityBoostUntil: Date | null; liveLat?: number | null; liveLng?: number | null; liveAt?: Date | null };
    userCity: string | null | undefined;
    job: { lat: number; lng: number; city: string; extraRadiusKm: number };
    trade: string;
    markets: MarketSnapshot[];
    limits: RadiusLimits;
    /** ISO country of the request (edge header), only used when the pro has no work location yet. */
    requestCountry?: string | null;
  },
): ServeVerdict {
  const { provider, job, markets } = input;
  if (!provider.trades.includes(input.trade)) return { ok: false, code: "TRADE", message: "This job is for a trade you do not offer." };
  if (!jobInActiveZone(markets, job, input.trade)) return { ok: false, code: "NO_ZONE", message: "This job is outside an active service area." };

  const jobCountry = marketForPoint(markets, { lat: job.lat, lng: job.lng }, job.city)?.countryCode ?? null;
  const hasPin = provider.baseLat != null && provider.baseLng != null;
  if (hasPin) {
    const km = haversineKm(job.lat, job.lng, provider.baseLat!, provider.baseLng!);
    const proCountry = marketForPoint(markets, { lat: provider.baseLat!, lng: provider.baseLng! }, input.userCity)?.countryCode ?? null;
    if ((jobCountry && proCountry && jobCountry !== proCountry) || km > 400) {
      return { ok: false, code: "OTHER_COUNTRY", message: "This job is in another country, outside the area where you work." };
    }
    // A pro who is online counts from where he is now, if that is closer than his saved work location.
    const here = liveSpot(provider);
    const nearKm = here ? Math.min(km, haversineKm(job.lat, job.lng, here.lat, here.lng)) : km;
    if (nearKm > effectiveRadiusKm(provider, input.limits) + job.extraRadiusKm) return { ok: false, code: "OUT_OF_AREA", message: "This job is outside your service area." };
    return { ok: true };
  }
  const proCountry = (input.userCity ? marketForCity(markets, input.userCity)?.countryCode : null) ?? null;
  const reqCountry = input.requestCountry ? input.requestCountry.toUpperCase() : null;
  if (jobCountry && ((proCountry && proCountry !== jobCountry) || (reqCountry && reqCountry !== "XX" && reqCountry !== jobCountry))) {
    return { ok: false, code: "OTHER_COUNTRY", message: "This job is in another country, outside the area where you work." };
  }
  return { ok: true };
}

/** A pro whose current job has been under way this long counts as nearly finished (typical home-service visit). */
const NEARLY_DONE_AFTER_MIN = 45;

/** 0 = free or nearly done with his job, 1 = only just started one. Pros are alerted either way. */
async function busyRanks(userIds: string[]): Promise<Map<string, number>> {
  const rows = await prisma.booking.findMany({
    where: { providerUserId: { in: userIds }, status: { in: ["ON_MY_WAY", "ARRIVED", "WORKING"] } },
    select: { providerUserId: true, status: true, timeline: true },
  });
  const ranks = new Map<string, number>();
  for (const r of rows) {
    const startedAt = (r.timeline as Record<string, string> | null)?.WORKING;
    const nearlyDone = r.status === "WORKING" && startedAt != null && Date.now() - new Date(startedAt).getTime() >= NEARLY_DONE_AFTER_MIN * 60000;
    ranks.set(r.providerUserId, Math.max(ranks.get(r.providerUserId) ?? 0, nearlyDone ? 0 : 1));
  }
  return ranks;
}

/** A pro is never alerted more than this many times for the same job (handoff §11.5). */
export const MAX_ALERTS_PER_PRO_PER_JOB = 2;

function localMinutes(timezone: string, at = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return h * 60 + m;
  } catch {
    return at.getUTCHours() * 60 + at.getUTCMinutes();
  }
}

/** Quiet window may wrap midnight (e.g. 22:00 → 07:00). */
export function inQuietHours(startMin: number | null, endMin: number | null, timezone: string, at = new Date()): boolean {
  if (startMin == null || endMin == null || startMin === endMin) return false;
  const now = localMinutes(timezone, at);
  return startMin < endMin ? now >= startMin && now < endMin : now >= startMin || now < endMin;
}

interface DispatchOptions {
  /** Only providers not already alerted for this job (used when the customer widens the search). */
  onlyNew?: boolean;
  /** Alert exactly this provider (a pro who just became active, or an admin concierge invite). */
  onlyProviderId?: string;
  /** Bypass paused / quiet-hours / daily-cap (admin concierge invites). */
  force?: boolean;
}

// Dispatch fan-out (Master Brief §8, handoff §11.5): on job insert, find every
// matching provider — ONLINE OR OFFLINE — by trade + city + verified + active
// (not waiting on a market cap) + radius, and push the nearest N. Offline pros
// are included on purpose: the push is how they learn about the job at all.
// Returns how many pros were alerted.
export async function dispatchJob(job: Job, options: DispatchOptions = {}): Promise<number> {
  const category = await prisma.serviceCategory.findUnique({ where: { id: job.categoryId } });
  if (!category) return 0;

  // v7 §2.5 "Book [Pro] again" — a private one-tap invite skips the normal
  // trade/city/radius fan-out entirely and alerts only that one provider,
  // regardless of their online/radius state (they were explicitly asked).
  if (job.preferredProviderId) {
    const preferred = await prisma.providerProfile.findUnique({
      where: { id: job.preferredProviderId },
      include: { user: { select: { id: true } } },
    });
    if (!preferred || preferred.dispatchStatus === "SUSPENDED") return 0;

    await prisma.dispatchAlert.create({
      data: { jobId: job.id, providerId: preferred.id, channels: ["push"], pushSent: true },
    });
    await notify({
      userId: preferred.user.id,
      type: "DISPATCH_ALERT",
      title: "A customer wants to book you again",
      body: `${job.areaLabel} · ${job.title}`,
      linkUrl: `/pro/jobs/${job.id}`,
      pushData: { jobId: job.id, goOnline: !preferred.isOnline },
    });
    return 1;
  }

  const [settings, markets, alreadyAlerted] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    getMarkets(),
    options.onlyNew || options.onlyProviderId
      ? prisma.dispatchAlert.findMany({ where: { jobId: job.id }, select: { providerId: true, alertCount: true } })
      : Promise.resolve([] as { providerId: string; alertCount: number }[]),
  ]);
  if (!jobInActiveZone(markets, job, category.trade)) return 0;
  const nearestN = settings?.alertNearestN ?? 12;
  const limits: RadiusLimits = radiusLimitsFor(settings, await getMarkets(), job.city);
  const timezone = marketForCity(markets, job.city)?.timezone ?? "Asia/Karachi";
  const alertedIds = new Set(alreadyAlerted.map((a) => a.providerId));

  // Only pros whose saved work location, or live position, is inside the largest radius this job can reach are loaded at
  // all (a coarse box; the exact per-pro radius is checked below). The old 1.2 km geohash cells silently limited alerts
  // to pros about 2 km away, whatever radius the pro had set.
  const reachKm = limits.max + job.extraRadiusKm;
  const dLat = reachKm / 111;
  const dLng = reachKm / (111 * Math.max(0.2, Math.cos((job.lat * Math.PI) / 180)));
  const box = (latKey: string, lngKey: string) => ({ [latKey]: { gte: job.lat - dLat, lte: job.lat + dLat }, [lngKey]: { gte: job.lng - dLng, lte: job.lng + dLng } });
  const useBox = !options.onlyProviderId && reachKm < 400;

  const candidates = await prisma.providerProfile.findMany({
    where: {
      isVerified: true,
      activation: "ACTIVE",
      // A pro without a profile photo is not sent jobs until he adds one.
      selfieUrl: { not: null },
      // Nor while a mandatory document has expired (see proDocuments.ts).
      documentsBlockedAt: null,
      trades: { has: category.trade },
      baseLat: { not: null },
      baseLng: { not: null },
      ...(useBox ? { OR: [box("baseLat", "baseLng"), { ...box("liveLat", "liveLng"), liveAt: { gte: new Date(Date.now() - LIVE_LOCATION_MAX_AGE_MS) } }] } : {}),
      ...(options.onlyProviderId ? { id: options.onlyProviderId } : {}),
    },
    include: { user: { select: { id: true, city: true, email: true } } },
  });

  // A customer who keeps cancelling after the pro has left reaches half as many pros for a while (lib/cancelFee.ts).
  const [asker, busyRank] = await Promise.all([
    prisma.user.findUnique({ where: { id: job.customerId }, select: { lateCancelCount: true, lastLateCancelAt: true } }),
    busyRanks(candidates.map((c) => c.user.id)),
  ]);
  const reachPenalty = asker ? hasLateCancelPenalty(asker) : false;

  const eligible = candidates
    .filter((p) => {
      if (p.user.city && p.user.city !== job.city) return false;
      // v6/v7 addendum — a pro over their wallet debt ceiling or past the
      // cancellation-rate threshold gets no new job alerts at all (the actual
      // enforcement point; bid-creation also blocks them, see bids/route.ts).
      if (p.dispatchStatus === "SUSPENDED") return false;
      if (alertedIds.has(p.id) && options.onlyNew) return false;
      // The same rule as the job list, the job page and the bid button, so a pro who is alerted always sees the job.
      return proServesJob({ provider: p, userCity: p.user.city, job, trade: category.trade, markets, limits }).ok;
    })
    .map((p) => {
      const here = liveSpot(p);
      const pinKm = haversineKm(job.lat, job.lng, p.baseLat!, p.baseLng!);
      return { p, distanceKm: here ? Math.min(pinKm, haversineKm(job.lat, job.lng, here.lat, here.lng)) : pinKm };
    })
    // Free pros and pros nearly done with their job first, then pros who have only just started one; nearest first within
    // each group (an offline pro gets the same push, so online status does not outrank distance). Busy pros are alerted like
    // everyone else: the same alert and ringtone, no "you are busy" notice.
    .sort((a, b) => (busyRank.get(a.p.user.id) ?? 0) - (busyRank.get(b.p.user.id) ?? 0) || a.distanceKm - b.distanceKm || Number(b.p.isOnline) - Number(a.p.isOnline))
    .slice(0, options.onlyProviderId ? 1 : Math.max(1, Math.floor((job.urgency === "EMERGENCY" ? nearestN * 2 : nearestN) * (reachPenalty ? 0.5 : 1))))
    .map((x) => x.p);

  if (eligible.length === 0) return 0;

  // Daily cap: alerts already received in the last 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.dispatchAlert.groupBy({
    by: ["providerId"],
    where: { providerId: { in: eligible.map((p) => p.id) }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const recentCount = new Map(recent.map((r) => [r.providerId, r._count._all]));

  const urgencyLabel = job.urgency === "EMERGENCY" ? "🚨 Emergency" : job.urgency === "TODAY" ? "Today" : "Scheduled";

  const plan = eligible.map((p) => {
    const mute =
      !options.force &&
      (p.alertsPaused ||
        inQuietHours(p.alertQuietStartMin, p.alertQuietEndMin, timezone) ||
        // An emergency rings outside working hours and past the daily cap: someone needs help now.
        (job.urgency !== "EMERGENCY" &&
          // Outside the pro's working hours (for a scheduled job: not working during its arrival window).
          (!(job.urgency === "SCHEDULED" && job.scheduledAt ? isAvailable(p.availability, timezone, job.scheduledAt, job.scheduledWindowMins ?? 60) : isAvailable(p.availability, timezone)) ||
            (recentCount.get(p.id) ?? 0) >= p.alertDailyCap)));
    return { p, pushSent: !mute };
  });

  // Offline pros also get an EMAIL (the push may never reach a phone that is off / has push blocked). Nearest first,
  // only while today's and this month's free-plan budget lasts, at most a few per pro per day, and never when they
  // paused alerts, are in quiet hours, or switched emails off (those are the same people `mute` already skips).
  let emailBudget = await alertEmailsLeft();
  const perProRecent = await recentEmailCounts(plan.map(({ p }) => p.id));
  const emailTo = new Set<string>();
  for (const { p, pushSent } of plan) {
    if (emailBudget <= 0) break;
    if (!pushSent || p.isOnline || !p.emailAlerts || !p.user.email) continue;
    if ((perProRecent.get(p.id) ?? 0) >= EMAIL_PER_PRO_PER_DAY) continue;
    emailTo.add(p.id);
    emailBudget--;
  }

  await prisma.dispatchAlert.createMany({
    data: plan.map(({ p, pushSent }) => ({ jobId: job.id, providerId: p.id, channels: [...(pushSent ? ["push"] : []), ...(emailTo.has(p.id) ? ["email"] : [])], pushSent })),
  });

  await Promise.allSettled(
    plan.map(({ p, pushSent }) =>
      notify({
        userId: p.user.id,
        type: "DISPATCH_ALERT",
        title: `New ${category.name} job — ${urgencyLabel}`,
        body: `${job.areaLabel} · ${job.title}`,
        linkUrl: `/pro/jobs/${job.id}`,
        push: pushSent,
        ...(emailTo.has(p.id)
          ? {
              channels: ["email" as const],
              emailSubject: `New ${category.name} job near you - ${urgencyLabel}`,
              emailBody: [
                `A customer near you needs a ${category.name.toLowerCase()}:`,
                ``,
                `${job.title}`,
                `Area: ${job.areaLabel}, ${job.city}`,
                `When: ${urgencyLabel}`,
                ``,
                `You are offline right now. Open the Servigic Pro app, go online and place your bid before another pro does.`,
                `Job link: ${process.env.NEXT_PUBLIC_APP_URL || "https://www.servigic.com"}/pro/jobs/${job.id}`,
                ``,
                `You get this email only while you are offline. To stop it: Servigic Pro app > Account > Job alerts > Email alerts.`,
              ].join("\n"),
            }
          : {}),
        // `goOnline` lets the app offer a one-tap "Go online and bid" when it opens from this push.
        pushData: { jobId: job.id, goOnline: !p.isOnline },
      }),
    ),
  );

  // Only pros whose alert was really sent: a muted pro (paused, quiet hours, outside working hours, daily cap) is not "notified".
  return plan.filter((x) => x.pushSent).length;
}

// Live dispatch feed (Master Brief §7 provider panel): every currently-OPEN
// job matching this provider's trades + city + radius, not just the ones
// dispatched at creation time (a provider may come online afterwards).
export async function findJobsForProvider(providerId: string) {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    include: { user: { select: { city: true } } },
  });
  // A pro still waiting on their market/trade cap sees no jobs yet.
  if (!provider || provider.trades.length === 0 || provider.activation !== "ACTIVE") return [];

  const [allJobs, markets, settings] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: "OPEN",
        city: provider.user.city ?? undefined,
        category: { trade: { in: provider.trades } },
      },
      include: { category: true, bids: { where: { providerId }, select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getMarkets(),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const limits: RadiusLimits = radiusLimitsFor(settings, await getMarkets(), provider.user.city);
  const jobs = allJobs;

  // Same rule as the bid button: right trade, live zone, same country, inside the radius once a work location is set.
  // Emergencies first, then newest.
  return jobs
    .filter((job) => proServesJob({ provider, userCity: provider.user.city, job, trade: job.category.trade, markets, limits }).ok)
    .sort((a, b) => Number(b.urgency === "EMERGENCY") - Number(a.urgency === "EMERGENCY"));
}
