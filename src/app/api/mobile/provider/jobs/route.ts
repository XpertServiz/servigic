import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { findJobsForProvider } from "@/lib/dispatch";
import { getMarkets, marketForPoint, acceptsJobs, tradeEnabled } from "@/lib/marketConfig";
import { loadAreas, matchAreaByPoint, matchAreaByText } from "@/lib/areas";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ jobs: [] });

  const jobs = profile.trades.length > 0 ? await findJobsForProvider(profile.id) : [];

  // "Launching soon in {area}": the Pro's home/shop pin is not (yet) inside a live zone that offers any of his trades.
  // He can still register and verify; his feed just says so instead of looking empty.
  let launchingSoon: { area: string } | null = null;
  if (profile.trades.length > 0) {
    const [markets, user] = await Promise.all([getMarkets(), prisma.user.findUnique({ where: { id: profile.userId }, select: { city: true } })]);
    if (markets.length > 0) {
      const pin = profile.baseLat != null && profile.baseLng != null ? { lat: profile.baseLat, lng: profile.baseLng } : null;
      const zone = pin ? marketForPoint(markets, pin, user?.city) : null;
      const live = Boolean(zone && acceptsJobs(zone) && profile.trades.some((t) => tradeEnabled(zone, t)));
      if (!live && (pin || user?.city)) {
        const areas = await loadAreas();
        const area = (pin ? matchAreaByPoint(pin.lat, pin.lng, areas) : null) ?? matchAreaByText(user?.city, areas);
        launchingSoon = { area: area?.name ?? user?.city ?? zone?.name ?? "your area" };
      }
    }
  }

  return NextResponse.json({
    // No profile photo yet: the app asks the pro to add one (no jobs or bids until then).
    photoRequired: !profile.selfieUrl,
    // A mandatory document expired: no jobs or bids until the renewed one is approved.
    documentsBlocked: Boolean(profile.documentsBlockedAt),
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      areaLabel: job.areaLabel,
      urgency: job.urgency,
      budgetPKR: job.budgetPKR,
      // Rounded to 2 decimals (~1 km) — enough to drop a pin in the right
      // neighbourhood on the map without revealing the customer's address
      // before the booking is confirmed.
      approxLat: Math.round(job.lat * 100) / 100,
      approxLng: Math.round(job.lng * 100) / 100,
      createdAt: job.createdAt,
      categoryName: job.category.name,
      categoryTrade: job.category.trade,
      categoryIcon: job.category.icon,
      alreadyBid: job.bids.length > 0,
    })),
    isOnline: profile.isOnline,
    boostedUntil: profile.visibilityBoostUntil,
    launchingSoon,
  });
}
