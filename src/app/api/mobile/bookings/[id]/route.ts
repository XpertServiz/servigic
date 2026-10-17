import { effectiveCommissionPct, getFoundingRule } from "@/lib/foundingPro";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getTimelineDurationMinutes } from "@/lib/jobDuration";
import { getPaymentMode } from "@/lib/featureFlags";
import { computeRevealStage } from "@/lib/reveal";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      job: { include: { category: true } },
      bid: { select: { estimatedPartsNote: true } },
      providerProfile: true,
      providerUser: { select: { name: true, phone: true } },
      customer: { select: { name: true, phone: true } },
      payment: true,
      dispute: true,
      review: true,
      customerReview: true,
    },
  });

  const isCustomer = booking?.customerId === auth.session.user.id;
  const isProvider = booking?.providerUserId === auth.session.user.id;
  if (!booking || (!isCustomer && !isProvider)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const revealStage = computeRevealStage(booking.status, booking.job.urgency);
  const unlocked = revealStage === "FULL";
  const paymentMode = await getPaymentMode();

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      paymentMode,
      totalPKR: booking.totalPKR,
      estimatedPartsNote: booking.bid.estimatedPartsNote,
      payoutPKR: booking.payoutPKR,
      commissionPKR: booking.commissionPKR,
      // Customer ad-reward discount already taken off this booking (PKR, 0 if none).
      // The customer pays the pro totalPKR - rewardDiscountPKR.
      rewardDiscountPKR: booking.rewardDiscountPKR,
      commissionPct: effectiveCommissionPct(booking.providerProfile, await getFoundingRule()),
      areaLabel: booking.job.areaLabel,
      // ISO timestamps keyed by status (CONFIRMED, ON_MY_WAY, ... ) — drives the
      // in-progress timer and ETA on the redesigned screens.
      timeline: booking.timeline,
      jobsCompleted: booking.providerProfile.jobsCompleted,
      jobTitle: booking.job.title,
      categoryIcon: booking.job.category.icon,
      jobLat: booking.job.lat,
      jobLng: booking.job.lng,
      exactAddress: unlocked ? booking.job.exactAddress : null,
      paymentDeadline: booking.paymentDeadline,
      paymentStatus: booking.payment?.status ?? null,
      otherPartyName: unlocked
        ? isCustomer
          ? booking.providerUser.name
          : booking.customer.name
        : isCustomer
          ? `Pro #${booking.providerProfile.serialNumber}`
          : "Customer",
      otherPartyPhone: unlocked ? (isCustomer ? booking.providerUser.phone : booking.customer.phone) : null,
      hasReview: isCustomer ? Boolean(booking.review) : Boolean(booking.customerReview),
      revealStage,
      // Back-compat alias — migrate every reader off this in favor of
      // revealStage; kept only so any not-yet-updated client doesn't hard-break.
      unlocked,
      // Total: from admin payment confirmation to job completion. Work:
      // from "Start Work" to "Job Done" specifically — the two spans the
      // spec asked to surface at the rating stage.
      totalDurationMinutes: getTimelineDurationMinutes(booking.timeline, "CONFIRMED", "COMPLETED"),
      workDurationMinutes: getTimelineDurationMinutes(booking.timeline, "WORKING", "DONE"),
      dispute: booking.dispute
        ? {
            reason: booking.dispute.reason,
            resolution: booking.dispute.resolution,
            notes: booking.dispute.notes,
            openedById: booking.dispute.openedById,
          }
        : null,
    },
  });
}
