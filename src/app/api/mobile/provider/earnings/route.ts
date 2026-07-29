import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getPaymentMode } from "@/lib/featureFlags";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ payouts: [], totalSent: 0, totalQueued: 0, commissionPct: 12 });

  const paymentMode = await getPaymentMode();
  const profileValue = { ratingAvg: profile.ratingAvg, verificationLevel: profile.verificationLevel, jobsCompleted: profile.jobsCompleted };

  if (paymentMode === "CASH_WALLET") {
    const wallet = await prisma.proWallet.findUnique({
      where: { providerId: profile.id },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { booking: { include: { job: { select: { title: true } } } } },
        },
        topUps: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    return NextResponse.json({
      commissionPct: profile.commissionPct,
      dispatchStatus: profile.dispatchStatus,
      dispatchBlockedReason: profile.dispatchBlockedReason,
      profileValue,
      wallet: {
        balancePKR: wallet?.balancePKR ?? 0,
        ceilingPKR: wallet?.ceilingPKR ?? 3000,
        unsettledJobCount: wallet?.unsettledJobCount ?? 0,
      },
      ledger: (wallet?.ledgerEntries ?? []).map((l) => ({
        id: l.id,
        type: l.type,
        amountPKR: l.amountPKR,
        memo: l.memo,
        jobTitle: l.booking?.job.title ?? null,
        createdAt: l.createdAt,
      })),
      topUps: (wallet?.topUps ?? []).map((t) => ({ id: t.id, amountPKR: t.amountPKR, status: t.status, createdAt: t.createdAt })),
    });
  }

  const payouts = await prisma.payout.findMany({
    where: { providerId: profile.id },
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { job: { include: { category: true } } } } },
  });

  const totalSent = payouts.filter((p) => p.status !== "QUEUED").reduce((sum, p) => sum + p.amountPKR, 0);
  const totalQueued = payouts.filter((p) => p.status === "QUEUED").reduce((sum, p) => sum + p.amountPKR, 0);

  return NextResponse.json({
    payouts: payouts.map((p) => ({
      id: p.id,
      amountPKR: p.amountPKR,
      status: p.status,
      jobTitle: p.booking.job.title,
      categoryIcon: p.booking.job.category.icon,
    })),
    totalSent,
    totalQueued,
    commissionPct: profile.commissionPct,
    profileValue,
  });
}
