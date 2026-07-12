import { prisma } from "@/lib/prisma";
import { encodeGeohash } from "@/lib/geo";
import { dispatchJob } from "@/lib/dispatch";
import { notify } from "@/lib/notify";
import type { PlanFrequency } from "@prisma/client";

const DUE_LEAD_DAYS = 3;
const STANDARD_BIDDING_WINDOW_HOURS = 24;

function advanceByFrequency(date: Date, frequency: PlanFrequency): Date {
  const next = new Date(date);
  const monthsToAdd = frequency === "MONTHLY" ? 1 : frequency === "QUARTERLY" ? 3 : 6;
  next.setMonth(next.getMonth() + monthsToAdd);
  return next;
}

// No real cron infra is wired up in this app yet (see admin note on this
// page) — call this from an admin-triggered "Run Sweep Now" button for now,
// and point a real scheduler (Vercel Cron / GitHub Actions) at a protected
// version of this later. Creates a normal Job for every plan whose next
// visit falls within DUE_LEAD_DAYS, exactly like a customer posting it by
// hand — the job still goes through real bidding or Instant Match.
export async function runMaintenancePlanSweep() {
  const dueThreshold = new Date(Date.now() + DUE_LEAD_DAYS * 24 * 60 * 60 * 1000);

  const duePlans = await prisma.maintenancePlan.findMany({
    where: { status: "ACTIVE", nextDueDate: { lte: dueThreshold } },
    include: { category: true, preferredProvider: { include: { user: { select: { id: true } } } } },
  });

  let createdCount = 0;

  for (const plan of duePlans) {
    const biddingClosesAt = new Date(Date.now() + STANDARD_BIDDING_WINDOW_HOURS * 60 * 60 * 1000);

    const job = await prisma.job.create({
      data: {
        customerId: plan.customerId,
        categoryId: plan.categoryId,
        title: `${plan.category.name} — recurring maintenance visit`,
        description: `Scheduled recurring ${plan.frequency.toLowerCase()} visit from your Servigic maintenance plan.`,
        urgency: "SCHEDULED",
        scheduledAt: plan.nextDueDate,
        city: plan.city,
        areaLabel: plan.areaLabel,
        exactAddress: plan.exactAddress,
        lat: plan.lat,
        lng: plan.lng,
        geohash: encodeGeohash(plan.lat, plan.lng),
        budgetPKR: plan.pricePerVisitPKR,
        biddingClosesAt,
      },
    });

    await prisma.planVisit.create({
      data: { planId: plan.id, scheduledDate: plan.nextDueDate, jobId: job.id },
    });

    await prisma.maintenancePlan.update({
      where: { id: plan.id },
      data: { nextDueDate: advanceByFrequency(plan.nextDueDate, plan.frequency) },
    });

    await dispatchJob(job);

    if (plan.preferredProvider) {
      await notify({
        userId: plan.preferredProvider.user.id,
        type: "DISPATCH_ALERT",
        title: "Your recurring customer has a visit due",
        body: `${plan.category.name} in ${plan.areaLabel} — they've booked with you before.`,
        linkUrl: `/pro/jobs/${job.id}`,
        channels: ["whatsapp"],
      });
    }

    createdCount += 1;
  }

  return createdCount;
}
