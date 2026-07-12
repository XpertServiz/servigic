import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { geohashNeighborhood, haversineKm } from "@/lib/geo";
import { getPriceBenchmark } from "@/lib/priceBenchmark";
import { estimateEtaMinutes } from "@/lib/eta";
import { notify } from "@/lib/notify";

const EMERGENCY_SURCHARGE_PCT = 15;
const OFFER_WINDOW_SECONDS = 90;
const FALLBACK_PRICE_PKR = 2000;

// Skip-the-bidding-wait offer for EMERGENCY jobs (Competitive Edge Addendum
// §2.5): system picks the best available pro and a fair price so the
// customer can book in one tap instead of waiting for bids to come in.
// Still a real Bid + still flows through full escrow — this only changes
// discovery speed, not the payment/trust model.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id }, include: { category: true } });
  if (!job || job.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "OPEN") return NextResponse.json({ error: "Job is no longer open" }, { status: 400 });
  if (job.urgency !== "EMERGENCY") {
    return NextResponse.json({ error: "Instant Match is only available for emergency jobs" }, { status: 400 });
  }

  const existingInstantBid = await prisma.bid.findFirst({
    where: { jobId: id, status: "PENDING", itemized: { path: ["instantMatch"], equals: true } },
    include: { provider: { include: { user: { select: { name: true } } } } },
  });
  if (existingInstantBid) {
    return NextResponse.json(buildOfferResponse(existingInstantBid));
  }

  const candidateGeohashes = geohashNeighborhood(job.geohash);
  const candidates = await prisma.providerProfile.findMany({
    where: {
      isOnline: true,
      isVerified: true,
      trades: { has: job.category.trade },
      geohash: { in: candidateGeohashes },
      baseLat: { not: null },
      baseLng: { not: null },
    },
    include: { user: { select: { id: true, name: true, city: true } } },
  });

  const eligible = candidates
    .filter((p) => {
      if (p.user.city && p.user.city !== job.city) return false;
      return haversineKm(job.lat, job.lng, p.baseLat!, p.baseLng!) <= p.serviceRadiusKm;
    })
    .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount || b.verificationLevel - a.verificationLevel);

  const best = eligible[0];
  if (!best) {
    return NextResponse.json({ error: "No pro is available for Instant Match right now — try Wait for Bids instead" }, { status: 404 });
  }

  const benchmark = await getPriceBenchmark(job.categoryId, job.city, job.subServiceId);
  const basePrice =
    benchmark?.medianWinningPKR ??
    (job.category.minPricePKR && job.category.maxPricePKR
      ? Math.round((job.category.minPricePKR + job.category.maxPricePKR) / 2)
      : (job.budgetPKR ?? FALLBACK_PRICE_PKR));
  const pricePKR = Math.round(basePrice * (1 + EMERGENCY_SURCHARGE_PCT / 100));
  const etaMinutes = estimateEtaMinutes(best.baseLat!, best.baseLng!, job.lat, job.lng);

  const bid = await prisma.bid.create({
    data: {
      jobId: id,
      providerId: best.id,
      userId: best.user.id,
      pricePKR,
      etaMinutes,
      message: "Instant Match offer — priced from real recent jobs in your area, plus emergency surcharge.",
      itemized: { instantMatch: true },
    },
    include: { provider: { include: { user: { select: { name: true } } } } },
  });

  await notify({
    userId: best.user.id,
    type: "BID_RECEIVED",
    title: "Instant Match — you were auto-selected for an emergency job",
    body: `${job.title} · PKR ${pricePKR.toLocaleString()}`,
    linkUrl: `/pro/jobs/${id}`,
  });

  return NextResponse.json(buildOfferResponse(bid));
}

function buildOfferResponse(bid: {
  id: string;
  pricePKR: number;
  etaMinutes: number;
  createdAt: Date;
  provider: { displayName: string; ratingAvg: number; ratingCount: number; verificationLevel: number };
}) {
  const expiresAt = new Date(bid.createdAt.getTime() + OFFER_WINDOW_SECONDS * 1000);
  return {
    bid: {
      id: bid.id,
      pricePKR: bid.pricePKR,
      etaMinutes: bid.etaMinutes,
      providerName: bid.provider.displayName,
      ratingAvg: bid.provider.ratingAvg,
      ratingCount: bid.provider.ratingCount,
      verificationLevel: bid.provider.verificationLevel,
    },
    expiresAt: expiresAt.toISOString(),
  };
}
