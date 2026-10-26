import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/prisma";
import { fileKeyOf } from "@/lib/directUpload";

// Job photos and videos (the customer's) and change-order photos (the pro's) are deleted from UploadThing 24 hours after the
// job ends (completed, cancelled or expired), to stay within the free storage. Kept: anything under an open dispute, payment
// and top-up receipts (money records) and pros' identity documents. Runs from the job-health cron.

const DAY = 24 * 60 * 60 * 1000;

export async function cleanupJobMedia(now = new Date()): Promise<{ jobs: number; files: number }> {
  const cutoff = new Date(now.getTime() - DAY);
  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED", "EXPIRED"] },
      updatedAt: { lt: cutoff },
      mediaDeletedAt: null,
      OR: [{ photos: { isEmpty: false } }, { videoUrl: { not: null } }, { booking: { changeOrders: { some: { OR: [{ photoUrl: { not: null } }, { proofImageUrl: { not: null } }] } } } }, { booking: { completionPhotoUrl: { not: null } } }],
    },
    select: {
      id: true,
      photos: true,
      videoUrl: true,
      booking: { select: { id: true, completionPhotoUrl: true, dispute: { select: { resolvedAt: true } }, changeOrders: { select: { id: true, photoUrl: true, proofImageUrl: true } } } },
    },
    take: 100,
  });

  let files = 0;
  const utapi = new UTApi();
  for (const job of jobs) {
    // Evidence stays while a dispute is open.
    if (job.booking?.dispute && !job.booking.dispute.resolvedAt) continue;
    const urls = [...job.photos, job.videoUrl, job.booking?.completionPhotoUrl ?? null, ...(job.booking?.changeOrders ?? []).flatMap((c) => [c.photoUrl, c.proofImageUrl])];
    const keys = urls.map(fileKeyOf).filter((k): k is string => Boolean(k));
    if (keys.length > 0) {
      const res = await utapi.deleteFiles(keys).catch((e) => {
        console.error("[media-cleanup]", job.id, e);
        return null;
      });
      if (!res?.success) continue;
      files += res.deletedCount;
    }
    await prisma.$transaction([
      prisma.job.update({ where: { id: job.id }, data: { photos: [], videoUrl: null, mediaDeletedAt: now } }),
      ...(job.booking ? [prisma.booking.update({ where: { id: job.booking.id }, data: { completionPhotoUrl: null } })] : []),
      ...(job.booking ? [prisma.changeOrder.updateMany({ where: { bookingId: job.booking.id }, data: { photoUrl: null, proofImageUrl: null } })] : []),
    ]);
  }
  return { jobs: jobs.length, files };
}
