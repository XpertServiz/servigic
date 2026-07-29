import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { respondChangeOrderSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";
import { getPaymentMode } from "@/lib/featureFlags";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = respondChangeOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const changeOrder = await prisma.changeOrder.findUnique({
    where: { id },
    include: { booking: { include: { providerProfile: true } } },
  });
  if (!changeOrder || changeOrder.booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Change order not found" }, { status: 404 });
  }
  if (changeOrder.status !== "PENDING") {
    return NextResponse.json({ error: "This change order already has a response" }, { status: 400 });
  }

  if (parsed.data.action !== "APPROVE") {
    const declined = await prisma.changeOrder.update({
      where: { id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await notify({
      userId: changeOrder.proposedById,
      type: "STATUS_UPDATE",
      title: "Extra work declined",
      body: "The customer declined your change order.",
      linkUrl: `/pro/bookings/${changeOrder.bookingId}`,
      channels: ["whatsapp"],
    });
    return NextResponse.json({ changeOrder: declined });
  }

  const paymentMode = await getPaymentMode();

  if (paymentMode === "PROTECTED") {
    const updated = await prisma.changeOrder.update({
      where: { id },
      data: { status: "AWAITING_PAYMENT", respondedAt: new Date() },
    });
    await notify({
      userId: changeOrder.proposedById,
      type: "STATUS_UPDATE",
      title: "Extra work approved",
      body: "The customer approved your change order — waiting on their payment now.",
      linkUrl: `/pro/bookings/${changeOrder.bookingId}`,
      channels: ["whatsapp"],
    });
    return NextResponse.json({ changeOrder: updated });
  }

  // CASH_WALLET (v6 addendum): no escrow step — approving folds the extra
  // amount straight into the booking's total/commission/payout and confirms
  // it immediately. The customer pays the whole (now-larger) total directly
  // to the pro after the job, exactly like the base booking amount; the
  // extra commission rides along into the same CommissionLedgerEntry written
  // at completion (bookings/[id]/confirm/route.ts), not a separate one here.
  const commissionPct = changeOrder.booking.providerProfile.commissionPct;
  const commissionCut = Math.round((changeOrder.extraAmountPKR * commissionPct) / 100);
  const payoutCut = changeOrder.extraAmountPKR - commissionCut;

  const [updated] = await prisma.$transaction([
    prisma.changeOrder.update({
      where: { id },
      data: { status: "CONFIRMED", respondedAt: new Date(), verifiedAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: changeOrder.bookingId },
      data: {
        totalPKR: { increment: changeOrder.extraAmountPKR },
        commissionPKR: { increment: commissionCut },
        payoutPKR: { increment: payoutCut },
      },
    }),
  ]);

  await notify({
    userId: changeOrder.proposedById,
    type: "STATUS_UPDATE",
    title: "Extra work approved",
    body: `Confirmed — collect the extra PKR ${changeOrder.extraAmountPKR.toLocaleString()} directly along with the rest.`,
    linkUrl: `/pro/bookings/${changeOrder.bookingId}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ changeOrder: updated });
}
