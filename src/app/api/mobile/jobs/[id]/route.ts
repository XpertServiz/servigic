import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { haversineKm } from "@/lib/geo";
import { distanceBand, proSerial } from "@/lib/anon";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: true,
      bids: {
        where: { status: { in: ["PENDING", "COUNTERED"] } },
        include: { provider: true },
        orderBy: { pricePKR: "asc" },
      },
    },
  });

  if (!job || job.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bids = job.bids.map((bid) => ({
    id: bid.id,
    proLabel: proSerial(bid.provider.serialNumber),
    pricePKR: bid.pricePKR,
    etaMinutes: bid.etaMinutes,
    message: bid.message,
    estimatedPartsNote: bid.estimatedPartsNote,
    status: bid.status,
    counterPricePKR: bid.counterPricePKR,
    ratingAvg: bid.provider.ratingAvg,
    ratingCount: bid.provider.ratingCount,
    jobsCompleted: bid.provider.jobsCompleted,
    verificationLevel: bid.provider.verificationLevel,
    distanceBand:
      bid.provider.baseLat && bid.provider.baseLng
        ? distanceBand(haversineKm(job.lat, job.lng, bid.provider.baseLat, bid.provider.baseLng))
        : "—",
  }));

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      photos: job.photos,
      status: job.status,
      urgency: job.urgency,
      areaLabel: job.areaLabel,
      categoryName: job.category.name,
      categoryIcon: job.category.icon,
    },
    bids,
  });
}
