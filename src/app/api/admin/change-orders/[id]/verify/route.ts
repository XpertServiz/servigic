import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const changeOrder = await prisma.changeOrder.findUnique({
    where: { id },
    include: { booking: { include: { providerProfile: true } } },
  });
  if (!changeOrder || changeOrder.status !== "PAID") {
    return NextResponse.json({ error: "Change order not awaiting verification" }, { status: 400 });
  }

  const commissionPct = changeOrder.booking.providerProfile.commissionPct;
  const commissionCut = Math.round((changeOrder.extraAmountPKR * commissionPct) / 100);
  const payoutCut = changeOrder.extraAmountPKR - commissionCut;

  await prisma.$transaction([
    prisma.changeOrder.update({
      where: { id },
      data: { status: "CONFIRMED", verifiedAt: new Date(), verifiedBy: auth.session.user.id },
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

  // Same treatment as the initial escrow payment: cash comes in now, but it's
  // owed to the provider until the job (and this extra work) is confirmed
  // done, so it's a liability, not revenue yet.
  await postJournalEntry({
    memo: `Change-order escrow received — booking ${changeOrder.bookingId.slice(0, 8)}`,
    source: "AUTO_CHANGE_ORDER_PAYMENT_VERIFIED",
    referenceId: changeOrder.bookingId,
    createdById: auth.session.user.id,
    lines: [
      { accountCode: SYSTEM_ACCOUNTS.CASH, debitPKR: changeOrder.extraAmountPKR },
      { accountCode: SYSTEM_ACCOUNTS.ESCROW_PAYABLE, creditPKR: changeOrder.extraAmountPKR },
    ],
  });

  await notify({
    userId: changeOrder.proposedById,
    type: "PAYMENT_VERIFIED",
    title: "Change order payment verified",
    body: `PKR ${changeOrder.extraAmountPKR.toLocaleString()} added to escrow — go ahead with the extra work.`,
    linkUrl: `/pro/bookings/${changeOrder.bookingId}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ ok: true });
}
