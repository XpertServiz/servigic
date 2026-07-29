import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { getPaymentMode } from "@/lib/featureFlags";

const PAYMENT_WINDOW_HOURS = 72;

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

  const booking = await prisma.$transaction(async (tx) => {
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

    await tx.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });
    await tx.bid.updateMany({
      where: { jobId: bid.jobId, id: { not: bid.id }, status: "PENDING" },
      data: { status: "DECLINED", declineReason: "Another bid was accepted" },
    });
    await tx.job.update({ where: { id: bid.jobId }, data: { status: "BOOKED" } });

    return created;
  });

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

  return NextResponse.json({ booking });
}
