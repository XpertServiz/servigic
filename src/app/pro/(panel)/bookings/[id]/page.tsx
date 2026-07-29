import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRevealStage } from "@/lib/reveal";
import { ProviderBookingClient } from "./ProviderBookingClient";

export default async function ProviderBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      job: { include: { category: true } },
      customer: { select: { name: true, phone: true } },
      customerReview: true,
      changeOrders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!booking || booking.providerUserId !== session?.user.id) notFound();

  const revealStage = computeRevealStage(booking.status, booking.job.urgency);
  const unlocked = revealStage === "FULL";

  return (
    <ProviderBookingClient
      currentUserId={session.user.id}
      booking={{
        id: booking.id,
        status: booking.status,
        payoutPKR: booking.payoutPKR,
        jobTitle: booking.job.title,
        categoryIcon: booking.job.category.icon,
        exactAddress: unlocked ? booking.job.exactAddress : null,
        jobLat: booking.job.lat,
        jobLng: booking.job.lng,
        customerName: unlocked ? booking.customer.name : "Customer",
        customerPhone: unlocked ? booking.customer.phone : null,
        hasReview: Boolean(booking.customerReview),
        revealStage,
        unlocked,
        changeOrders: booking.changeOrders.map((c) => ({
          id: c.id,
          description: c.description,
          extraAmountPKR: c.extraAmountPKR,
          status: c.status,
        })),
      }}
    />
  );
}
