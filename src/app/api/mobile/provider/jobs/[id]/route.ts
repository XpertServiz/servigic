import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { firstNameOnly, distanceBand } from "@/lib/anon";
import { haversineKm } from "@/lib/geo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id }, include: { category: true, customer: { select: { name: true } } } }),
    prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } }),
  ]);
  if (!job || !profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myBid = await prisma.bid.findUnique({ where: { jobId_providerId: { jobId: job.id, providerId: profile.id } } });

  // Once a bid is accepted, the job detail screen is a dead end — the pro
  // needs the booking (contact, map, message thread, status buttons)
  // instead, so hand back its id for the mobile app to redirect to.
  const booking = myBid ? await prisma.booking.findUnique({ where: { bidId: myBid.id }, select: { id: true } }) : null;

  const distance =
    profile.baseLat && profile.baseLng ? distanceBand(haversineKm(job.lat, job.lng, profile.baseLat, profile.baseLng)) : "—";

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      photos: job.photos,
      status: job.status,
      areaLabel: job.areaLabel,
      categoryName: job.category.name,
      categoryIcon: job.category.icon,
      customerFirstName: firstNameOnly(job.customer.name),
      distanceBand: distance,
    },
    myBid,
    bookingId: booking?.id ?? null,
    verificationLevel: profile.verificationLevel,
  });
}
