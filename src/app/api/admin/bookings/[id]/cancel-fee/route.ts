import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({ action: z.enum(["paid", "waive"]) });

// Clears a customer's cancellation fee. "paid": the customer paid Servigic, so the pro's share (the fee minus Servigic's usual
// commission rate on that booking) goes into his wallet. "waive": nobody pays. Either way the customer can post again.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { id } = await params;
  const b = await prisma.booking.findUnique({ where: { id }, select: { id: true, cancelFeePKR: true, cancelFeeStatus: true, customerId: true, providerId: true, totalPKR: true, commissionPKR: true } });
  if (!b || b.cancelFeeStatus !== "OWED") return NextResponse.json({ error: "No unpaid fee on this booking" }, { status: 404 });

  const ratio = b.totalPKR > 0 ? b.commissionPKR / b.totalPKR : 0;
  const proShare = Math.max(0, b.cancelFeePKR - Math.round(b.cancelFeePKR * ratio));
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { cancelFeeStatus: parsed.data.action === "paid" ? "PAID" : "WAIVED" } });
    const owner = await tx.user.findUnique({ where: { id: b.customerId }, select: { cancelFeeOwedPKR: true } });
    await tx.user.update({ where: { id: b.customerId }, data: { cancelFeeOwedPKR: Math.max(0, (owner?.cancelFeeOwedPKR ?? 0) - b.cancelFeePKR) } });
    if (parsed.data.action === "paid" && proShare > 0) {
      const wallet = await tx.proWallet.upsert({ where: { providerId: b.providerId }, update: { balancePKR: { increment: proShare } }, create: { providerId: b.providerId, balancePKR: proShare } });
      await tx.commissionLedgerEntry.create({ data: { walletId: wallet.id, type: "CANCEL_FEE_CREDIT", amountPKR: proShare, bookingId: id, memo: "Cancellation fee paid by the customer" } });
    }
  });
  return NextResponse.json({ ok: true, proShare });
}
