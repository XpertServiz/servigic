import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { firstNameOnly, distanceBand } from "@/lib/anon";
import { haversineKm } from "@/lib/geo";
import { headers } from "next/headers";
import { getMarkets } from "@/lib/marketConfig";
import { proServesJob } from "@/lib/dispatch";
import { getTxCurrencyForCity } from "@/lib/txCurrency";
import { priceGuideFor } from "@/lib/priceGuide";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id }, include: { category: true, customer: { select: { name: true } } } }),
    prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } }),
  ]);
  if (!job || !profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myBid = await prisma.bid.findUnique({ where: { jobId_providerId: { jobId: job.id, providerId: profile.id } } });
  if (!myBid) {
    const [markets, settings, proUser, reqHeaders] = await Promise.all([
      getMarkets(),
      prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
      prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { city: true } }),
      headers(),
    ]);
    const verdict = proServesJob({
      provider: profile,
      userCity: proUser?.city,
      job,
      trade: job.category.trade,
      markets,
      limits: { min: settings?.proRadiusMinKm ?? 2, max: settings?.proRadiusMaxKm ?? 15 },
      requestCountry: reqHeaders.get("x-vercel-ip-country") || reqHeaders.get("cf-ipcountry"),
    });
    if (!verdict.ok) return NextResponse.json({ error: verdict.message, code: "OUT_OF_AREA" }, { status: 404 });
  }

  // Once a bid is accepted, the job detail screen is a dead end — the pro
  // needs the booking (contact, map, message thread, status buttons)
  // instead, so hand back its id for the mobile app to redirect to.
  const booking = myBid ? await prisma.booking.findUnique({ where: { bidId: myBid.id }, select: { id: true } }) : null;

  const distance =
    profile.baseLat && profile.baseLng ? distanceBand(haversineKm(job.lat, job.lng, profile.baseLat, profile.baseLng)) : "—";

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      photos: job.photos,
      status: job.status,
      areaLabel: job.areaLabel,
      categoryName: job.category.name,
      urgency: job.urgency,
      scheduledAt: job.scheduledAt,
      scheduledWindowMins: job.scheduledWindowMins,
      categoryIcon: job.category.icon,
      customerFirstName: firstNameOnly(job.customer.name),
      distanceBand: distance,
      // The price the customer offers (in his own currency) and that currency, so the pro can accept it or answer with his own.
      budgetPKR: job.budgetPKR,
      currency: await getTxCurrencyForCity(job.city),
      guide: await priceGuideFor(job.categoryId, job.city).catch(() => null),
    },
    myBid,
    bookingId: booking?.id ?? null,
    verificationLevel: profile.verificationLevel,
  });
}
