import { prisma } from "@/lib/prisma";

// Auto-expiry side-effects (Master Brief §12): run as a cheap updateMany at
// the top of the relevant page/API load instead of a scheduled cron job.
// Safe to call on every request — the `where` clause makes it idempotent.

export async function expireStaleJobBidding() {
  await prisma.job.updateMany({
    where: { status: "OPEN", biddingClosesAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

export async function expireUnpaidBookings() {
  const expired = await prisma.booking.findMany({
    where: { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
    select: { id: true, jobId: true },
  });
  if (expired.length === 0) return;

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: { status: "EXPIRED" },
    }),
    prisma.job.updateMany({
      where: { id: { in: expired.map((b) => b.jobId) } },
      data: { status: "OPEN" },
    }),
  ]);
}

export async function autoConfirmDoneBookings() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.booking.updateMany({
    where: { status: "DONE", updatedAt: { lt: cutoff } },
    data: { status: "COMPLETED" },
  });
}

export async function runExpirySweep() {
  await Promise.all([expireStaleJobBidding(), expireUnpaidBookings(), autoConfirmDoneBookings()]);
}
