import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const UNLOCKED_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "COMPLETED"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      job: { include: { category: true } },
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

  const unlocked = UNLOCKED_STATUSES.includes(booking.status);

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      totalPKR: booking.totalPKR,
      payoutPKR: booking.payoutPKR,
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
      unlocked,
    },
  });
}
