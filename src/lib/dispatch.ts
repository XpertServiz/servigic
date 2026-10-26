import { prisma } from "@/lib/prisma";
import { isAvailable } from "@/lib/availability";
import { notify } from "@/lib/notify";
import { geohashNeighborhood, haversineKm } from "@/lib/geo";
import { getMarkets, marketForCity, marketForPoint, acceptsJobs, tradeEnabled, type MarketSnapshot } from "@/lib/marketConfig";
import type { Job } from "@prisma/client";
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

export type ServeVerdict = { ok: true } | { ok: false; code: "TRADE" | "NO_ZONE" | "OTHER_COUNTRY" | "OUT_OF_AREA"; message: string };

/**
 * Can this pro take this job at all? The rule behind the feed, the alerts, the job page and the bid button, so they can never
 * disagree: the pro offers the trade; the job is inside a live zone where that trade is on; the job is in the pro's own COUNTRY
 * (a Saudi pro never bids on a Pakistani customer, whatever his city says); and, once he has set his work location, inside his
 * service radius. Without a work location the country is judged from his registered city, then from where the request comes from.
 */
export function proServesJob(
  input: {
    provider: { trades: string[]; baseLat: number | null; baseLng: number | null; serviceRadiusKm: number; visibilityBoostUntil: Date | null };
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
    if (km > effectiveRadiusKm(provider, input.limits) + job.extraRadiusKm) return { ok: false, code: "OUT_OF_AREA", message: "This job is outside your service area." };
    return { ok: true };
  }
  const proCountry = (input.userCity ? marketForCity(markets, input.userCity)?.countryCode : null) ?? null;
  const reqCountry = input.requestCountry ? input.requestCountry.toUpperCase() : null;
  if (jobCountry && ((proCountry && proCountry !== jobCountry) || (reqCountry && reqCountry !== "XX" && reqCountry !== jobCountry))) {
    return { ok: false, code: "OTHER_COUNTRY", message: "This job is in another country, outside the area where you work." };
  }
  return { ok: true };
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

  // A widened search reaches past the nearby geohash cells, so it filters by distance only.
  const useGeohash = job.extraRadiusKm === 0 && !options.onlyProviderId;

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
      ...(useGeohash ? { geohash: { in: geohashNeighborhood(job.geohash) } } : {}),
      ...(options.onlyProviderId ? { id: options.onlyProviderId } : {}),
    },
    include: { user: { select: { id: true, city: true, email: true } } },
  });

  const eligible = candidates
    .filter((p) => {
      if (p.user.city && p.user.city !== job.city) return false;
      // v6/v7 addendum — a pro over their wallet debt ceiling or past the
      // cancellation-rate threshold gets no new job alerts at all (the actual
      // enforcement point; bid-creation also blocks them, see bids/route.ts).
      if (p.dispatchStatus === "SUSPENDED") return false;
      if (alertedIds.has(p.id) && options.onlyNew) return false;
      const distanceKm = haversineKm(job.lat, job.lng, p.baseLat!, p.baseLng!);
      return distanceKm <= effectiveRadiusKm(p, limits) + job.extraRadiusKm;
    })
    .map((p) => ({ p, distanceKm: haversineKm(job.lat, job.lng, p.baseLat!, p.baseLng!) }))
    // Nearest matching pros first (an offline pro gets the same push, so online status does not outrank distance).
    .sort((a, b) => a.distanceKm - b.distanceKm || Number(b.p.isOnline) - Number(a.p.isOnline))
    .slice(0, options.onlyProviderId ? 1 : job.urgency === "EMERGENCY" ? nearestN * 2 : nearestN)
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

  return plan.length;
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
