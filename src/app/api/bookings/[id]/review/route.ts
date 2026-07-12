import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { reviewSchema } from "@/lib/validation/booking";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "You can only rate completed jobs" }, { status: 400 });
  }

  const isCustomer = booking.customerId === auth.session.user.id;
  const isProvider = booking.providerUserId === auth.session.user.id;
  if (!isCustomer && !isProvider) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rating, tags, comment } = parsed.data;

  if (isCustomer) {
    const review = await prisma.review.upsert({
      where: { bookingId: id },
      update: { rating, tags, comment },
      create: { bookingId: id, authorId: booking.customerId, targetId: booking.providerUserId, rating, tags, comment },
    });

    const agg = await prisma.review.aggregate({
      where: { targetId: booking.providerUserId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.providerProfile.update({
      where: { id: booking.providerId },
      data: { ratingAvg: agg._avg.rating ?? rating, ratingCount: agg._count.rating },
    });

    return NextResponse.json({ review });
  }

  const customerReview = await prisma.customerReview.upsert({
    where: { bookingId: id },
    update: { rating, tags, comment },
    create: { bookingId: id, authorId: booking.providerUserId, targetId: booking.customerId, rating, tags, comment },
  });

  return NextResponse.json({ review: customerReview });
}
