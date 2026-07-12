import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ payouts: [], totalSent: 0, totalQueued: 0, commissionPct: 12 });

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
  });
}
