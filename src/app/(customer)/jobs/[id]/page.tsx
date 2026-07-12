import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";
import { haversineKm } from "@/lib/geo";
import { distanceBand, proSerial } from "@/lib/anon";
import { BidList } from "./BidList";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await runExpirySweep();
  const { id } = await params;
  const session = await auth();

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

  if (!job || job.customerId !== session?.user.id) notFound();

  const bids = job.bids.map((bid) => ({
    id: bid.id,
    proLabel: proSerial(bid.provider.serialNumber),
    pricePKR: bid.pricePKR,
    etaMinutes: bid.etaMinutes,
    message: bid.message,
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

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-text-muted">
          <span>{job.category.icon}</span> {job.category.name} · {job.areaLabel}
        </div>
        <h1 className="font-display text-3xl font-bold">{job.title}</h1>
        <p className="mt-2 text-text-muted">{job.description}</p>
        <span className="mt-3 inline-block rounded-full border border-border-subtle px-3 py-1 text-xs font-bold text-text-muted">
          {job.status.replace("_", " ")}
        </span>
      </div>

      <BidList jobId={job.id} bids={bids} jobStatus={job.status} />
    </div>
  );
}
