import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { getPaymentMode } from "@/lib/featureFlags";

const PAYMENT_WINDOW_HOURS = 72;

// Thrown inside the transaction to roll everything back (including the job
// claim) when this accept lost a race — mapped to a 409 below.
class BidUnavailableError extends Error {}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const bid = await prisma.bid.findUnique({
    where: { id },
    include: { job: true, provider: true },
  });
  if (!bid || bid.job.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }
  if (bid.status !== "PENDING") {
    return NextResponse.json({ error: "This bid is no longer available" }, { status: 400 });
  }

  const paymentMode = await getPaymentMode();
  const commissionPct = bid.provider.commissionPct;
  const commissionPKR = Math.round((bid.pricePKR * commissionPct) / 100);
  const payoutPKR = bid.pricePKR - commissionPKR;
  const isInstantMatch = Boolean(bid.itemized && typeof bid.itemized === "object" && (bid.itemized as { instantMatch?: boolean }).instantMatch);

  let booking;
  let filledProviderUserIds: string[] = [];
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Race guard: the pre-transaction reads above are only a fast-fail. The
      // real "only one winner" decision is these two conditional updates —
      // each is a single atomic UPDATE ... WHERE, so when two accepts for
      // the same job run concurrently, exactly one flips the job OPEN →
      // BOOKED and exactly one flips its bid PENDING → ACCEPTED; the other
      // sees count 0 and rolls the whole transaction back.
      const claimedJob = await tx.job.updateMany({
        where: { id: bid.jobId, status: "OPEN" },
        data: { status: "BOOKED" },
      });
      if (claimedJob.count !== 1) throw new BidUnavailableError();

      const claimedBid = await tx.bid.updateMany({
        where: { id: bid.id, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      if (claimedBid.count !== 1) throw new BidUnavailableError();

      const created = await tx.booking.create({
        data: {
          jobId: bid.jobId,
          bidId: bid.id,
          customerId: auth.session.user.id,
          providerUserId: bid.userId,
          providerId: bid.providerId,
          totalPKR: bid.pricePKR,
          commissionPKR,
          payoutPKR,
          matchType: isInstantMatch ? "INSTANT" : "BID",
          // v6 addendum: CASH_WALLET skips the escrow payment step entirely —
          // the booking is confirmed the instant the bid is accepted, and
          // commission debt is recognized later at completion (see
          // bookings/[id]/confirm/route.ts), not here.
          ...(paymentMode === "PROTECTED"
            ? {
                paymentDeadline: new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000),
                status: "PENDING_PAYMENT" as const,
                timeline: { PENDING_PAYMENT: new Date().toISOString() },
              }
            : {
                paymentDeadline: null,
                status: "CONFIRMED" as const,
                timeline: { CONFIRMED: new Date().toISOString() },
              }),
        },
      });

      // Auto-resolve: every other still-open bid on this job (including
      // ones sitting in a counter-offer) is declined in the same
      // transaction, so there is never a moment where two pros hold a live
      // bid on a job that's already been filled.
      const losing = await tx.bid.findMany({
        where: { jobId: bid.jobId, id: { not: bid.id }, status: { in: ["PENDING", "COUNTERED"] } },
        select: { id: true, userId: true },
      });
      if (losing.length > 0) {
        await tx.bid.updateMany({
          where: { id: { in: losing.map((b) => b.id) } },
          data: { status: "DECLINED", declineReason: "This job was filled" },
        });
      }

      return { created, losingUserIds: losing.map((b) => b.userId) };
    });
    booking = result.created;
    filledProviderUserIds = result.losingUserIds;
  } catch (e) {
    if (e instanceof BidUnavailableError) {
      return NextResponse.json({ error: "This job was already filled or the bid is no longer available" }, { status: 409 });
    }
    throw e;
  }

  await notify({
    userId: bid.userId,
    type: "BID_ACCEPTED",
    title: "Your bid was accepted!",
    body:
      paymentMode === "PROTECTED"
        ? "Waiting for the customer to complete payment."
        : "Job confirmed — head over once you're ready.",
    linkUrl: `/pro/bookings/${booking.id}`,
    channels: ["whatsapp"],
  });

  // Polite "this job was filled" for everyone who lost out — best-effort,
  // the accept itself has already committed and must not fail on a
  // notification error.
  await Promise.allSettled(
    filledProviderUserIds.map((userId) =>
      notify({
        userId,
        type: "BID_DECLINED",
        title: "This job was filled",
        body: `The customer chose another pro for "${bid.job.title}". More jobs are on the way.`,
        linkUrl: `/pro/jobs/${bid.jobId}`,
      })
    )
  );

  return NextResponse.json({ booking });
}
