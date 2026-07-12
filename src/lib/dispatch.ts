import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { geohashNeighborhood, haversineKm } from "@/lib/geo";
import type { Job } from "@prisma/client";

// Dispatch fan-out (Master Brief §8): on job insert, find every ONLINE
// provider matching trade + city + within service radius (geohash
// proximity, no paid distance API), then alert via push/WhatsApp/SMS.
export async function dispatchJob(job: Job) {
  const category = await prisma.serviceCategory.findUnique({ where: { id: job.categoryId } });
  if (!category) return;

  const candidateGeohashes = geohashNeighborhood(job.geohash);

  const candidates = await prisma.providerProfile.findMany({
    where: {
      isOnline: true,
      isVerified: true,
      trades: { has: category.trade },
      geohash: { in: candidateGeohashes },
      baseLat: { not: null },
      baseLng: { not: null },
    },
    include: { user: { select: { id: true, city: true } } },
  });

  const eligible = candidates.filter((p) => {
    if (p.user.city && p.user.city !== job.city) return false;
    const distanceKm = haversineKm(job.lat, job.lng, p.baseLat!, p.baseLng!);
    return distanceKm <= p.serviceRadiusKm;
  });

  if (eligible.length === 0) return;

  await prisma.dispatchAlert.createMany({
    data: eligible.map((p) => ({ jobId: job.id, providerId: p.id, channels: ["push", "whatsapp"] })),
  });

  const urgencyLabel = job.urgency === "EMERGENCY" ? "🚨 Emergency" : job.urgency === "TODAY" ? "Today" : "Scheduled";

  await Promise.allSettled(
    eligible.map((p) =>
      notify({
        userId: p.user.id,
        type: "DISPATCH_ALERT",
        title: `New ${category.name} job — ${urgencyLabel}`,
        body: `${job.areaLabel} · ${job.title}`,
        linkUrl: `/pro/jobs/${job.id}`,
        channels: ["whatsapp", "sms"],
      })
    )
  );

  return eligible.length;
}

// Live dispatch feed (Master Brief §7 provider panel): every currently-OPEN
// job matching this provider's trades + city + radius, not just the ones
// dispatched at creation time (a provider may come online afterwards).
export async function findJobsForProvider(providerId: string) {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    include: { user: { select: { city: true } } },
  });
  if (!provider || provider.trades.length === 0) return [];

  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",
      city: provider.user.city ?? undefined,
      category: { trade: { in: provider.trades } },
    },
    include: { category: true, bids: { where: { providerId }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!provider.baseLat || !provider.baseLng) return jobs;

  return jobs.filter((job) => haversineKm(job.lat, job.lng, provider.baseLat!, provider.baseLng!) <= provider.serviceRadiusKm);
}
