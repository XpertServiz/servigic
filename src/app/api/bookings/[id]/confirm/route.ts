import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { getPaymentMode } from "@/lib/featureFlags";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";
import { recomputeProviderStanding } from "@/lib/providerStanding";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "DONE") {
    return NextResponse.json({ error: "This job hasn't been marked done yet" }, { status: 400 });
  }

  const paymentMode = await getPaymentMode();

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: "COMPLETED", timeline: { ...(booking.timeline as object), COMPLETED: new Date().toISOString() } },
    }),
    prisma.job.update({ where: { id: booking.jobId }, data: { status: "COMPLETED" } }),
    prisma.providerProfile.update({ where: { id: booking.providerId }, data: { jobsCompleted: { increment: 1 } } }),
    ...(paymentMode === "PROTECTED"
      ? [
          prisma.payout.upsert({
            where: { bookingId: id },
            update: {},
            create: { bookingId: id, providerId: booking.providerId, amountPKR: booking.payoutPKR, method: "EASYPAISA" },
          }),
        ]
      : []),
  ]);

  if (paymentMode === "CASH_WALLET") {
    // Commission debt is recognized here, at completion — not at bid
    // acceptance — so a booking that later gets disputed/cancelled before
    // reaching COMPLETED never provisions debt for a job that didn't happen.
    const wallet = await prisma.proWallet.upsert({
      where: { providerId: booking.providerId },
      update: {},
      create: {
        providerId: booking.providerId,
        ceilingPKR: (await prisma.siteSettings.findUnique({ where: { id: "singleton" } }))?.defaultWalletCeilingPKR ?? 3000,
      },
    });
    await prisma.$transaction([
      prisma.proWallet.update({
        where: { id: wallet.id },
        data: { balancePKR: { decrement: booking.commissionPKR }, unsettledJobCount: { increment: 1 } },
      }),
      prisma.commissionLedgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "COMMISSION_DEBIT",
          amountPKR: booking.commissionPKR,
          bookingId: booking.id,
          memo: `Commission owed — booking ${booking.id.slice(0, 8)}`,
        },
      }),
    ]);
    await postJournalEntry({
      memo: `Commission recognized (cash-after-job) — booking ${booking.id.slice(0, 8)}`,
      source: "AUTO_CASH_WALLET_COMMISSION_DEBIT",
      referenceId: booking.id,
      lines: [
        { accountCode: SYSTEM_ACCOUNTS.PRO_WALLET_RECEIVABLE, debitPKR: booking.commissionPKR },
        { accountCode: SYSTEM_ACCOUNTS.COMMISSION_INCOME, creditPKR: booking.commissionPKR },
      ],
    });
    await recomputeProviderStanding(booking.providerId);
  }

  await notify({
    userId: booking.providerUserId,
    type: "JOB_COMPLETED",
    title: paymentMode === "PROTECTED" ? "Job confirmed complete — payout queued" : "Job confirmed complete",
    body:
      paymentMode === "PROTECTED"
        ? `PKR ${booking.payoutPKR.toLocaleString()} will be sent to your payout account.`
        : `Collect PKR ${booking.totalPKR.toLocaleString()} directly from the customer — Servigic doesn't collect this payment. Commission of PKR ${booking.commissionPKR.toLocaleString()} has been added to your wallet balance.`,
    linkUrl: `/pro/earnings`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ booking: updated });
}
