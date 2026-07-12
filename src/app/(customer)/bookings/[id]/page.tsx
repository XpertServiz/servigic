import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";
import { detectMarket } from "@/lib/geoDetect";
import { BookingDetailClient } from "./BookingDetailClient";

const UNLOCKED_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "COMPLETED"];

export default async function CustomerBookingPage({ params }: { params: Promise<{ id: string }> }) {
  await runExpirySweep();
  const { id } = await params;
  const [session, market] = await Promise.all([auth(), detectMarket()]);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      job: { include: { category: true } },
      providerProfile: true,
      providerUser: { select: { name: true, phone: true } },
      payment: true,
      dispute: true,
      review: true,
      changeOrders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!booking || booking.customerId !== session?.user.id) notFound();

  const unlocked = UNLOCKED_STATUSES.includes(booking.status);

  return (
    <BookingDetailClient
      currentUserId={session.user.id}
      booking={{
        id: booking.id,
        status: booking.status,
        totalPKR: booking.totalPKR,
        jobTitle: booking.job.title,
        categoryIcon: booking.job.category.icon,
        exactAddress: unlocked ? booking.job.exactAddress : null,
        jobLat: booking.job.lat,
        jobLng: booking.job.lng,
        providerName: unlocked ? booking.providerUser.name : `Pro #${booking.providerProfile.serialNumber}`,
        providerPhone: unlocked ? booking.providerUser.phone : null,
        paymentDeadline: booking.paymentDeadline.toISOString(),
        payment: booking.payment ? { status: booking.payment.status } : null,
        hasReview: Boolean(booking.review),
        dispute: booking.dispute ? { resolution: booking.dispute.resolution } : null,
        unlocked,
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
