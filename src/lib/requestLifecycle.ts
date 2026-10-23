import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { dispatchJob } from "@/lib/dispatch";

// A customer's request from posting to closing, with the customer told at every step:
//   - searching: "still looking for a pro" (jobHealth.ts, after a few minutes without bids);
//   - closing soon: a warning before bidding closes when no pro has been chosen, with "Keep my request open";
//   - closed: a notice when it closes without a pro, with the option to reopen it;
//   - kept open / reopened: the request waits up to 7 more days and is sent again to pros (new pros included).
// Also the per-customer cap on open requests (protects pros from fake or duplicate requests).

export const MAX_OPEN_REQUESTS = Number(process.env.MAX_OPEN_JOBS_PER_CUSTOMER) || 5;
export const KEEP_OPEN_DAYS = 7;
const HOUR = 60 * 60 * 1000;

export async function openRequestCount(customerId: string): Promise<number> {
  return prisma.job.count({ where: { customerId, status: "OPEN", biddingClosesAt: { gt: new Date() } } });
}

/** Closes requests whose bidding time ran out, and tells each customer (with the option to keep it open). */
export async function expireRequestsWithNotice(now = new Date()): Promise<number> {
  const due = await prisma.job.findMany({ where: { status: "OPEN", biddingClosesAt: { lt: now } }, select: { id: true, title: true, customerId: true }, take: 200 });
  if (due.length === 0) return 0;
  const closed = await prisma.job.updateMany({ where: { id: { in: due.map((j) => j.id) }, status: "OPEN" }, data: { status: "EXPIRED" } });
  for (const job of due) {
    await notify({
      userId: job.customerId,
      type: "STATUS_UPDATE",
      title: "Request closed: no pro chosen in time",
      body: `"${job.title}" was closed because no pro was available or chosen. Tap to keep it open for ${KEEP_OPEN_DAYS} more days, and we will tell you when a pro is available.`,
      linkUrl: `/jobs/${job.id}`,
      pushData: { jobId: job.id, expired: true },
    }).catch(() => null);
  }
  return closed.count;
}

/** Warns customers whose request is about to close without a chosen pro (2 hours before; 10 minutes for emergencies). */
export async function warnRequestsClosingSoon(now = new Date()): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN", expiryWarnedAt: null, biddingClosesAt: { gt: now, lte: new Date(now.getTime() + 2 * HOUR) } },
    select: { id: true, title: true, customerId: true, urgency: true, biddingClosesAt: true, _count: { select: { bids: true } } },
    take: 200,
  });
  let sent = 0;
  for (const job of jobs) {
    const left = job.biddingClosesAt.getTime() - now.getTime();
    if (job.urgency === "EMERGENCY" && left > 10 * 60 * 1000) continue;
    const claimed = await prisma.job.updateMany({ where: { id: job.id, expiryWarnedAt: null }, data: { expiryWarnedAt: now } });
    if (claimed.count !== 1) continue;
    const mins = Math.max(1, Math.round(left / 60000));
    await notify({
      userId: job.customerId,
      type: "STATUS_UPDATE",
      title: job._count.bids > 0 ? "Choose a pro before your request closes" : "Your request closes soon",
      body:
        job._count.bids > 0
          ? `"${job.title}" closes in about ${mins} minutes. Open it and accept a bid, or keep it open longer.`
          : `No pro is available yet for "${job.title}". It closes in about ${mins} minutes because no pros are free right now. Keep it open and we will tell you as soon as one is.`,
      linkUrl: `/jobs/${job.id}`,
      pushData: { jobId: job.id, closingSoon: true },
    }).catch(() => null);
    sent++;
  }
  return sent;
}

export type KeepOpenResult = { ok: true; biddingClosesAt: Date; reopened: boolean } | { ok: false; status: number; error: string; code: string };

/** "Keep my request open": an open request gets 7 more days; a closed (expired) one is reopened and sent to pros again. */
export async function keepRequestOpen(jobId: string, customerId: string): Promise<KeepOpenResult> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { booking: { select: { id: true } } } });
  if (!job || job.customerId !== customerId) return { ok: false, status: 404, error: "Not found", code: "NOT_FOUND" };
  if (job.booking) return { ok: false, status: 400, error: "This request already has a booked pro.", code: "BOOKED" };
  if (job.status !== "OPEN" && job.status !== "EXPIRED") return { ok: false, status: 400, error: "This request can no longer be reopened.", code: "NOT_REOPENABLE" };
  if (job.status === "EXPIRED" && (await openRequestCount(customerId)) >= MAX_OPEN_REQUESTS) {
    return { ok: false, status: 429, error: `You already have ${MAX_OPEN_REQUESTS} open requests. Close one first.`, code: "OPEN_JOB_LIMIT" };
  }
  const base = Math.max(Date.now(), job.biddingClosesAt.getTime());
  const biddingClosesAt = new Date(base + KEEP_OPEN_DAYS * 24 * HOUR);
  const updated = await prisma.job.update({ where: { id: jobId }, data: { status: "OPEN", biddingClosesAt, expiryWarnedAt: null, noBidsNotifiedAt: null } });
  // Pros who became available since (new pros, newly approved skills) get the request now.
  await dispatchJob(updated, { onlyNew: true }).catch(() => 0);
  return { ok: true, biddingClosesAt, reopened: job.status === "EXPIRED" };
}
