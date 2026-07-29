import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";
import { detectMarket } from "@/lib/geoDetect";
import { getTimelineDurationMinutes } from "@/lib/jobDuration";
import { getPaymentMode } from "@/lib/featureFlags";
import { computeRevealStage } from "@/lib/reveal";
import { BookingDetailClient } from "./BookingDetailClient";

export default async function CustomerBookingPage({ params }: { params: Promise<{ id: string }> }) {
  await runExpirySweep();
  const { id } = await params;
  const [session, market, paymentMode] = await Promise.all([auth(), detectMarket(), getPaymentMode()]);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      job: { include: { category: true } },
      bid: { select: { estimatedPartsNote: true } },
      providerProfile: true,
      providerUser: { select: { name: true, phone: true } },
      payment: true,
      dispute: true,
      review: true,
      changeOrders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!booking || booking.customerId !== session?.user.id) notFound();

  const revealStage = computeRevealStage(booking.status, booking.job.urgency);
  const unlocked = revealStage === "FULL";

  return (
    <BookingDetailClient
      currentUserId={session.user.id}
      paymentMode={paymentMode}
      booking={{
        id: booking.id,
        status: booking.status,
        totalPKR: booking.totalPKR,
        estimatedPartsNote: booking.bid.estimatedPartsNote,
        jobTitle: booking.job.title,
        categoryIcon: booking.job.category.icon,
        exactAddress: unlocked ? booking.job.exactAddress : null,
        jobLat: booking.job.lat,
        jobLng: booking.job.lng,
        providerName: unlocked ? booking.providerUser.name : `Pro #${booking.providerProfile.serialNumber}`,
        providerPhone: unlocked ? booking.providerUser.phone : null,
        paymentDeadline: booking.paymentDeadline?.toISOString() ?? null,
        payment: booking.payment ? { status: booking.payment.status } : null,
        hasReview: Boolean(booking.review),
        dispute: booking.dispute ? { resolution: booking.dispute.resolution } : null,
        revealStage,
        unlocked,
        totalDurationMinutes: getTimelineDurationMinutes(booking.timeline, "CONFIRMED", "COMPLETED"),
        workDurationMinutes: getTimelineDurationMinutes(booking.timeline, "WORKING", "DONE"),
        changeOrders: booking.changeOrders.map((c) => ({
          id: c.id,
          description: c.description,
          photoUrl: c.photoUrl,
          extraAmountPKR: c.extraAmountPKR,
          status: c.status,
          proofImageUrl: c.proofImageUrl,
        })),
      }}
      legalDisclaimer={market.legalDisclaimer}
    />
  );
}
