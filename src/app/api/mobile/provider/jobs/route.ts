import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { findJobsForProvider } from "@/lib/dispatch";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ jobs: [] });

  const jobs = profile.trades.length > 0 ? await findJobsForProvider(profile.id) : [];

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      areaLabel: job.areaLabel,
      urgency: job.urgency,
      budgetPKR: job.budgetPKR,
      categoryName: job.category.name,
      categoryIcon: job.category.icon,
      alreadyBid: job.bids.length > 0,
    })),
    isOnline: profile.isOnline,
  });
}
