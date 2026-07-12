import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";

const schema = z.object({ accountRef: z.string().trim().max(80).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const payout = await prisma.payout.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), accountRef: parsed.success ? parsed.data.accountRef : undefined },
    include: { provider: true, booking: true },
  });

  // Normal case: this payout is the full amount the booking always owed the
  // provider (totalPKR - commissionPKR) — clear the whole escrow liability,
  // recognize the platform's commission as revenue now that the job is done.
  //
  // Reduced case (payout.amountPKR < booking.payoutPKR): this only happens
  // via a dispute PARTIAL_REFUND resolution, where the provider gets less
  // than originally bid and the rest goes back to the customer. Conservative
  // treatment: recognize zero commission on a disputed transaction — the
  // whole original escrow liability is cleared straight to cash with no
  // revenue line, rather than guessing a pro-rated commission split.
  const isFullNormalPayout = payout.amountPKR === payout.booking.payoutPKR;

  if (isFullNormalPayout) {
    await postJournalEntry({
      memo: `Payout sent + commission recognized — booking ${payout.bookingId.slice(0, 8)}`,
      source: "AUTO_PAYOUT_SENT",
      referenceId: payout.bookingId,
      lines: [
        { accountCode: SYSTEM_ACCOUNTS.ESCROW_PAYABLE, debitPKR: payout.booking.totalPKR },
        { accountCode: SYSTEM_ACCOUNTS.CASH, creditPKR: payout.amountPKR },
        { accountCode: SYSTEM_ACCOUNTS.COMMISSION_INCOME, creditPKR: payout.booking.commissionPKR },
      ],
    });
  } else {
    await postJournalEntry({
      memo: `Payout sent (dispute-reduced, no commission recognized) — booking ${payout.bookingId.slice(0, 8)}`,
      source: "AUTO_PAYOUT_SENT",
      referenceId: payout.bookingId,
      lines: [
        { accountCode: SYSTEM_ACCOUNTS.ESCROW_PAYABLE, debitPKR: payout.booking.totalPKR },
        { accountCode: SYSTEM_ACCOUNTS.CASH, creditPKR: payout.booking.totalPKR },
      ],
    });
  }

  await notify({
    userId: payout.provider.userId,
    type: "PAYOUT_SENT",
    title: "Payout sent 💸",
    body: `PKR ${payout.amountPKR.toLocaleString()} has been sent to your account.`,
    linkUrl: "/pro/earnings",
    channels: ["whatsapp"],
  });

  return NextResponse.json({ payout });
}
