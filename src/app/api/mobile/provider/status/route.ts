import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getMarkets, resolveMarket, acceptsJobs } from "@/lib/marketConfig";

// Everything the Pro app's home screen needs to be honest about the situation (handoff §11.4):
// is the pro active or approved-and-waiting, what is the market doing, early-pro perks, alert settings.
export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const [profile, user, markets, settings] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } }),
    prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { city: true } }),
    getMarkets(),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const geo = ((await headers()).get("x-vercel-ip-country") || "").toUpperCase() || null;
  const market = resolveMarket(markets, user?.city, geo);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Only real numbers: jobs posted in the pro's area this week.
  const jobsThisWeek = market
    ? await prisma.job.count({ where: { city: { in: market.cities }, createdAt: { gte: weekAgo } } })
    : 0;

  return NextResponse.json({
    activation: profile.activation,
    approved: profile.isVerified || profile.verificationLevel >= 1,
    foundingPro: profile.foundingPro,
    commissionFreeJobsLeft: profile.commissionFreeJobsLeft,
    market: market ? { name: market.name, status: market.status, open: acceptsJobs(market) } : null,
    jobsThisWeek,
    limits: {
      radiusMinKm: settings?.proRadiusMinKm ?? 2,
      radiusMaxKm: settings?.proRadiusMaxKm ?? 15,
      radiusDefaultKm: settings?.proRadiusDefaultKm ?? 5,
      maxTrades: settings?.maxTradesPerPro ?? 3,
    },
    alerts: {
      paused: profile.alertsPaused,
      quietStartMin: profile.alertQuietStartMin,
      quietEndMin: profile.alertQuietEndMin,
      dailyCap: profile.alertDailyCap,
    },
  });
}
