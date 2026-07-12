import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { haversineKm } from "@/lib/geo";

// Export for ai-service/app/ml/train_bid_win.py — see that file's docstring for usage.
export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const bids = await prisma.bid.findMany({
    where: { status: { in: ["ACCEPTED", "DECLINED", "WITHDRAWN"] } },
    include: { job: true, provider: true },
  });

  const categoryAverages = await prisma.bid.groupBy({
    by: ["jobId"],
    _avg: { pricePKR: true },
  });
  const categoryAvgByJob = new Map(categoryAverages.map((c) => [c.jobId, c._avg.pricePKR ?? 0]));

  const rows = bids.map((bid) => ({
    pricePKR: bid.pricePKR,
    categoryAvgPricePKR: Math.round(categoryAvgByJob.get(bid.jobId) ?? bid.pricePKR),
    etaMinutes: bid.etaMinutes,
    providerRatingAvg: bid.provider.ratingAvg || 4,
    providerJobsCompleted: bid.provider.jobsCompleted,
    distanceKm:
      bid.provider.baseLat && bid.provider.baseLng
        ? haversineKm(bid.job.lat, bid.job.lng, bid.provider.baseLat, bid.provider.baseLng)
        : 5,
    won: bid.status === "ACCEPTED" ? 1 : 0,
  }));

  return NextResponse.json(rows);
}
