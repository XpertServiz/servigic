import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { disputeResolveSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = disputeResolveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const dispute = await prisma.dispute.findUnique({ where: { id }, include: { booking: true } });
  if (!dispute || dispute.resolution) {
    return NextResponse.json({ error: "Dispute not found or already resolved" }, { status: 400 });
  }

  const { resolution, notes } = parsed.data;
  const bookingStatus = resolution === "RELEASE" ? "COMPLETED" : "CANCELLED";

  await prisma.$transaction([
    prisma.dispute.update({
      where: { id },
      data: { resolution, notes, resolvedBy: auth.session.user.id, resolvedAt: new Date() },
    }),
    prisma.booking.update({ where: { id: dispute.bookingId }, data: { status: bookingStatus } }),
    ...(resolution === "RELEASE"
      ? [
          prisma.payout.upsert({
            where: { bookingId: dispute.bookingId },
            update: {},
            create: {
              bookingId: dispute.bookingId,
              providerId: dispute.booking.providerId,
              amountPKR: dispute.booking.payoutPKR,
              method: "EASYPAISA",
            },
          }),
        ]
      : []),
    ...(resolution === "PARTIAL_REFUND"
      ? [
          prisma.payout.upsert({
            where: { bookingId: dispute.bookingId },
            update: {},
            create: {
              bookingId: dispute.bookingId,
              providerId: dispute.booking.providerId,
              amountPKR: Math.round(dispute.booking.payoutPKR / 2),
              method: "EASYPAISA",
              adminNote: "Partial refund — 50% payout per dispute resolution",
            },
          }),
        ]
      : []),
  ]);

  // FULL_REFUND never creates a Payout row (nothing goes to the provider), so
  // unlike RELEASE/PARTIAL_REFUND — which post via the payout mark-sent
  // route once admin actually sends that money — this is the only place the
  // full-refund cash movement gets recorded. Zero commission recognized.
  if (resolution === "FULL_REFUND") {
    await postJournalEntry({
      memo: `Full refund to customer — dispute on booking ${dispute.bookingId.slice(0, 8)}`,
      source: "AUTO_DISPUTE_REFUND",
      referenceId: dispute.bookingId,
      createdById: auth.session.user.id,
      lines: [
        { accountCode: SYSTEM_ACCOUNTS.ESCROW_PAYABLE, debitPKR: dispute.booking.totalPKR },
        { accountCode: SYSTEM_ACCOUNTS.CASH, creditPKR: dispute.booking.totalPKR },
      ],
    });
  }

  await Promise.allSettled([
    notify({
      userId: dispute.booking.customerId,
      type: "DISPUTE_RESOLVED",
      title: "Dispute resolved",
      body: `Resolution: ${resolution.replace("_", " ")}`,
      linkUrl: `/bookings/${dispute.bookingId}`,
      channels: ["whatsapp"],
    }),
    notify({
      userId: dispute.booking.providerUserId,
      type: "DISPUTE_RESOLVED",
      title: "Dispute resolved",
      body: `Resolution: ${resolution.replace("_", " ")}`,
      linkUrl: `/pro/bookings/${dispute.bookingId}`,
      channels: ["whatsapp"],
    }),
  ]);

  return NextResponse.json({ ok: true });
}
