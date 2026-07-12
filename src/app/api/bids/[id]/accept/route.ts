import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

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

  const commissionPct = bid.provider.commissionPct;
  const commissionPKR = Math.round((bid.pricePKR * commissionPct) / 100);
  const payoutPKR = bid.pricePKR - commissionPKR;
  const paymentDeadline = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);

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
        paymentDeadline,
        timeline: { PENDING_PAYMENT: new Date().toISOString() },
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
    body: "Waiting for the customer to complete payment.",
    linkUrl: `/pro/bookings/${booking.id}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ booking });
}
