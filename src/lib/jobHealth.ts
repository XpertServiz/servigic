import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// Customer empty-state: a job with no bids after the configured wait gets one
// in-app + push message with the options (widen the search / edit the job)
// instead of silence (handoff §11.2). Idempotent via Job.noBidsNotifiedAt, so it
// is cheap to call from the existing lazy sweep and from the cron endpoint.
export async function notifyJobsWithoutBids(): Promise<number> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const minutes = settings?.noBidsAfterMin ?? 20;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const stale = await prisma.job.findMany({
    where: {
      status: "OPEN",
      noBidsNotifiedAt: null,
      createdAt: { lt: cutoff },
      biddingClosesAt: { gt: new Date() },
      bids: { none: {} },
    },
    select: { id: true, title: true, customerId: true },
    take: 50,
  });

  for (const job of stale) {
    // Claim first so two concurrent sweeps can't both notify.
    const claimed = await prisma.job.updateMany({ where: { id: job.id, noBidsNotifiedAt: null }, data: { noBidsNotifiedAt: new Date() } });
    if (claimed.count !== 1) continue;
    await notify({
      userId: job.customerId,
      type: "STATUS_UPDATE",
      title: "Still looking for a pro",
      body: `We are still searching for available pros for "${job.title}". Widen your search area or edit the request to reach more pros. We will tell you as soon as one bids.`,
      linkUrl: `/jobs/${job.id}`,
      pushData: { jobId: job.id, noBids: true },
    }).catch((e) => console.error("[jobHealth] notify failed", e));
  }
  return stale.length;
}
