import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { dispatchJob } from "@/lib/dispatch";
import { acceptsJobs, getMarkets, marketForCity, type MarketSnapshot } from "@/lib/marketConfig";
import type { ProviderProfile } from "@prisma/client";

// Pro supply/demand balance (handoff §11.4). An approved pro is ACTIVE only
// while their market is open (enabled, PILOT/LIVE) and at least one of their
// trades is enabled there and under the admin's cap. Otherwise they are WAITING
// ("Approved, waiting for jobs in your area"): no alerts, no bidding, a push the
// moment their zone/trade opens. WAITING pros are activated first-come-first-served.

const isApproved = (p: Pick<ProviderProfile, "verificationLevel" | "isVerified">) => p.isVerified || p.verificationLevel >= 1;

async function activeCount(market: MarketSnapshot, trade: string, excludeId: string): Promise<number> {
  return prisma.providerProfile.count({
    where: {
      id: { not: excludeId },
      activation: "ACTIVE",
      trades: { has: trade as never },
      user: { city: { in: market.cities } },
    },
  });
}

/** Does this pro currently have somewhere to work? */
async function hasCapacity(profile: Pick<ProviderProfile, "id" | "trades" | "activation">, market: MarketSnapshot): Promise<boolean> {
  if (!acceptsJobs(market)) return false;
  if (profile.trades.length === 0) return true; // nothing to cap yet; checked again once they pick trades
  for (const trade of profile.trades) {
    const cfg = market.trades[trade];
    if (!cfg?.enabled) continue;
    if (profile.activation === "ACTIVE" || cfg.maxActivePros == null) return true; // already active pros are never demoted by a cap
    if ((await activeCount(market, trade, profile.id)) < cfg.maxActivePros) return true;
  }
  return false;
}

/**
 * Recomputes one pro's activation and applies the side effects of a change.
 * Safe to call any time (approval, trade change, admin edits the market).
 */
export async function evaluateProActivation(profileId: string): Promise<"ACTIVE" | "WAITING"> {
  const profile = await prisma.providerProfile.findUnique({ where: { id: profileId }, include: { user: { select: { id: true, city: true } } } });
  if (!profile) return "ACTIVE";
  if (!isApproved(profile)) return profile.activation; // not through verification yet — nothing to decide

  const markets = await getMarkets({ fresh: true });
  const market = marketForCity(markets, profile.user.city);
  // No market config for this city (legacy data / table empty): behave as before.
  if (markets.length === 0 || !market) {
    if (profile.activation !== "ACTIVE") await prisma.providerProfile.update({ where: { id: profile.id }, data: { activation: "ACTIVE", waitingSince: null } });
    return "ACTIVE";
  }

  const open = await hasCapacity(profile, market);
  const next = open ? "ACTIVE" : "WAITING";

  if (next === "WAITING" && profile.activation === "ACTIVE") {
    await prisma.providerProfile.update({ where: { id: profile.id }, data: { activation: "WAITING", waitingSince: new Date() } });
    return "WAITING";
  }
  if (next === "WAITING") {
    if (!profile.waitingSince) await prisma.providerProfile.update({ where: { id: profile.id }, data: { waitingSince: new Date() } });
    return "WAITING";
  }

  // next === ACTIVE
  const wasWaiting = profile.activation === "WAITING";
  const firstActivation = !profile.activatedAt;
  if (!wasWaiting && !firstActivation) return "ACTIVE";

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const early = firstActivation && market.status === "PILOT";
  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      activation: "ACTIVE",
      waitingSince: null,
      activatedAt: profile.activatedAt ?? new Date(),
      // Early-pro incentives: pros who join while their market is still a pilot.
      ...(early ? { foundingPro: true, commissionFreeJobsLeft: settings?.earlyProFreeJobs ?? 0 } : {}),
    },
  });

  if (wasWaiting) {
    await notify({
      userId: profile.user.id,
      type: "SYSTEM",
      title: "Jobs are now open in your area",
      body: `Servigic has started in ${market.name}. Go online to see and bid on jobs.`,
      linkUrl: "/pro/jobs",
      pushData: { goOnline: true },
    });
  }
  await redispatchOpenJobsToPro(profile.id, market).catch((e) => console.error("[activation] redispatch failed", e));
  return "ACTIVE";
}

/** Admin changed a market / its matrix / a cap: activate waiting pros (FIFO) up to the new capacity. */
export async function activateWaitingForMarket(marketId: string): Promise<number> {
  const markets = await getMarkets({ fresh: true });
  const market = markets.find((m) => m.id === marketId);
  if (!market) return 0;
  const waiting = await prisma.providerProfile.findMany({
    where: { activation: "WAITING", user: { city: { in: market.cities } } },
    orderBy: { waitingSince: "asc" },
    select: { id: true },
  });
  let activated = 0;
  for (const w of waiting) {
    if ((await evaluateProActivation(w.id)) === "ACTIVE") activated++;
  }
  // Markets that just closed or lost a trade: demote active pros that no longer have anywhere to work.
  if (!acceptsJobs(market) || Object.values(market.trades).some((t) => !t.enabled)) {
    const active = await prisma.providerProfile.findMany({ where: { activation: "ACTIVE", user: { city: { in: market.cities } } }, select: { id: true } });
    for (const a of active) await evaluateProActivation(a.id);
  }
  return activated;
}

/**
 * A pro just became active: hand them the jobs that are still open in their area, and tell
 * customers who had no pros that one is now available (handoff §11.2).
 */
async function redispatchOpenJobsToPro(providerId: string, market: MarketSnapshot) {
  const profile = await prisma.providerProfile.findUnique({ where: { id: providerId }, select: { trades: true } });
  if (!profile) return;
  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",
      biddingClosesAt: { gt: new Date() },
      city: { in: market.cities },
      category: { trade: { in: profile.trades } },
      bids: { none: {} },
    },
    include: { _count: { select: { dispatchAlerts: true } } },
    take: 25,
  });
  for (const job of jobs) {
    const alerted = await dispatchJob(job, { onlyProviderId: providerId });
    if (alerted > 0 && job._count.dispatchAlerts === 0) {
      await notify({
        userId: job.customerId,
        type: "STATUS_UPDATE",
        title: "A pro is now available for your request",
        body: `${job.title} — a verified pro near you has been notified.`,
        linkUrl: `/jobs/${job.id}`,
        pushData: { jobId: job.id },
      });
    }
  }
}
