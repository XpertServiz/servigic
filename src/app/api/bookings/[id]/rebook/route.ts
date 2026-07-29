import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { encodeGeohash } from "@/lib/geo";
import { dispatchJob } from "@/lib/dispatch";

const BIDDING_WINDOW_HOURS = 24;

// v7 §2.5 "Book [Pro] again" — economic retention design: makes rebooking
// through the platform as convenient as messaging the pro directly,
// removing the convenience motive for going off-app. Reuses the completed
// job's details and directs dispatch at that one pro only (preferredProviderId).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id }, include: { job: true } });
  if (!booking || booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "You can only rebook a completed job" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      customerId: auth.session.user.id,
      categoryId: booking.job.categoryId,
      subServiceId: booking.job.subServiceId,
      title: booking.job.title,
      description: booking.job.description,
      urgency: booking.job.urgency,
      city: booking.job.city,
      areaLabel: booking.job.areaLabel,
      exactAddress: booking.job.exactAddress,
      lat: booking.job.lat,
      lng: booking.job.lng,
      geohash: encodeGeohash(booking.job.lat, booking.job.lng),
      budgetPKR: booking.job.budgetPKR,
      biddingClosesAt: new Date(Date.now() + BIDDING_WINDOW_HOURS * 60 * 60 * 1000),
      preferredProviderId: booking.providerId,
    },
  });

  await dispatchJob(job);

  return NextResponse.json({ job });
}
