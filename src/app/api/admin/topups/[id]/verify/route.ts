import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";
import { recomputeProviderStanding } from "@/lib/providerStanding";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const topUp = await prisma.topUp.findUnique({
    where: { id },
    include: { wallet: { include: { provider: { include: { user: { select: { id: true } } } } } } },
  });
  if (!topUp || topUp.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Top-up not awaiting verification" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.topUp.update({
      where: { id },
      data: { status: "VERIFIED", verifiedAt: new Date(), verifiedBy: auth.session.user.id },
    }),
    prisma.proWallet.update({
      where: { id: topUp.walletId },
      data: {
        balancePKR: { increment: topUp.amountPKR },
        // Full reset on any verified top-up (not a partial decrement) — a
        // simplifying choice; a partial top-up that doesn't clear the whole
        // ceiling arguably shouldn't zero this out. Revisit with product if
        // pros start gaming small top-ups to repeatedly clear the counter.
        unsettledJobCount: 0,
      },
    }),
    prisma.commissionLedgerEntry.create({
      data: { walletId: topUp.walletId, type: "TOPUP_CREDIT", amountPKR: topUp.amountPKR, topUpId: id, memo: "Top-up verified" },
    }),
  ]);

  await postJournalEntry({
    memo: `Top-up verified — wallet ${topUp.walletId.slice(0, 8)}`,
    source: "AUTO_TOPUP_VERIFIED",
    referenceId: topUp.walletId,
    createdById: auth.session.user.id,
    lines: [
      { accountCode: SYSTEM_ACCOUNTS.CASH, debitPKR: topUp.amountPKR },
      { accountCode: SYSTEM_ACCOUNTS.PRO_WALLET_RECEIVABLE, creditPKR: topUp.amountPKR },
    ],
  });

  await recomputeProviderStanding(topUp.wallet.provider.id);
  await notify({
    userId: topUp.wallet.provider.user.id,
    type: "SYSTEM",
    title: "Top-up verified",
    body: `PKR ${topUp.amountPKR.toLocaleString()} added to your wallet.`,
    linkUrl: "/pro/earnings",
    channels: ["whatsapp"],
  });

  return NextResponse.json({ ok: true });
}
