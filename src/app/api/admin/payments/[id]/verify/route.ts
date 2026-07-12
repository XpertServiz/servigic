import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
  if (!payment || payment.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Payment not awaiting verification" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.payment.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date(), verifiedBy: auth.session.user.id } }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: "CONFIRMED", timeline: { ...(payment.booking.timeline as object), CONFIRMED: new Date().toISOString() } },
    }),
  ]);

  // Escrow received: cash comes in, but it's owed to the provider until the
  // job completes, so it's a liability, not revenue yet.
  await postJournalEntry({
    memo: `Escrow received — booking ${payment.bookingId.slice(0, 8)}`,
    source: "AUTO_PAYMENT_VERIFIED",
    referenceId: payment.bookingId,
    lines: [
      { accountCode: SYSTEM_ACCOUNTS.CASH, debitPKR: payment.booking.totalPKR },
      { accountCode: SYSTEM_ACCOUNTS.ESCROW_PAYABLE, creditPKR: payment.booking.totalPKR },
    ],
  });

  await Promise.allSettled([
    notify({
      userId: payment.booking.customerId,
      type: "PAYMENT_VERIFIED",
      title: "Payment verified — job confirmed",
      body: "Contact details, address, and chat are now unlocked.",
      linkUrl: `/bookings/${payment.bookingId}`,
      channels: ["whatsapp"],
    }),
    notify({
      userId: payment.booking.providerUserId,
      type: "PAYMENT_VERIFIED",
      title: "Job confirmed — customer is waiting",
      body: "Payment verified. Contact details are now unlocked.",
      linkUrl: `/pro/bookings/${payment.bookingId}`,
      channels: ["whatsapp"],
    }),
  ]);

  return NextResponse.json({ ok: true });
}
