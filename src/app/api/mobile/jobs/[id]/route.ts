import { NextResponse } from "next/server";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { haversineKm } from "@/lib/geo";
import { distanceBand, proSerial } from "@/lib/anon";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: true,
      booking: { select: { id: true, status: true } },
      bids: {
        where: { status: { in: ["PENDING", "COUNTERED"] } },
        include: { provider: true },
        orderBy: { pricePKR: "asc" },
      },
    },
  });

  if (!job || job.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [notifiedCount, settings] = await Promise.all([
    prisma.dispatchAlert.count({ where: { jobId: job.id } }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { noBidsAfterMin: true } }),
  ]);

  const bids = job.bids.map((bid) => ({
    id: bid.id,
    proLabel: proSerial(bid.provider.serialNumber),
    pricePKR: bid.pricePKR,
    etaMinutes: bid.etaMinutes,
    message: bid.message,
    estimatedPartsNote: bid.estimatedPartsNote,
    status: bid.status,
    counterPricePKR: bid.counterPricePKR,
    ratingAvg: bid.provider.ratingAvg,
    ratingCount: bid.provider.ratingCount,
    jobsCompleted: bid.provider.jobsCompleted,
    verificationLevel: bid.provider.verificationLevel,
    distanceBand:
      bid.provider.baseLat && bid.provider.baseLng
        ? distanceBand(haversineKm(job.lat, job.lng, bid.provider.baseLat, bid.provider.baseLng))
        : "—",
  }));

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      photos: job.photos,
      status: job.status,
      urgency: job.urgency,
      areaLabel: job.areaLabel,
      categoryName: job.category.name,
      categoryIcon: job.category.icon,
      createdAt: job.createdAt,
      extraRadiusKm: job.extraRadiusKm,
      budgetPKR: job.budgetPKR,
      videoUrl: job.videoUrl,
      scheduledAt: job.scheduledAt,
      scheduledWindowMins: job.scheduledWindowMins,
      biddingClosesAt: job.biddingClosesAt,
      bookingId: job.booking?.id ?? null,
      bookingStatus: job.booking?.status ?? null,
      // Until a bid is accepted the customer may change or cancel the request; afterwards changes go through the booking.
      canEdit: job.status === "OPEN" && !job.booking,
      canCancel: job.status === "OPEN" && !job.booking,
      canReopen: job.status === "EXPIRED" && !job.booking,
    },
    // Waiting-for-bids screen: how many nearby pros were notified, and when to tell the customer nothing came.
    notifiedCount,
    noBidsAfterMin: settings?.noBidsAfterMin ?? 20,
    bids,
  });
}

const editSchema = z.object({
  title: z.string().trim().min(5).max(120).optional(),
  description: z.string().trim().min(10).max(1000).optional(),
  budgetPKR: z.number().int().min(0).nullable().optional(),
  areaLabel: z.string().trim().min(2).max(80).optional(),
});

// The customer changes the request while no bid is accepted. Pros who already bid are told, so they can update their bid.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const job = await prisma.job.findUnique({ where: { id }, include: { booking: { select: { id: true } }, bids: { where: { status: { in: ["PENDING", "COUNTERED"] } }, select: { provider: { select: { userId: true } } } } } });
  if (!job || job.customerId !== auth.session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "OPEN" || job.booking) {
    return NextResponse.json({ error: "A pro is already booked, so the request can no longer be edited. Message your pro to agree any change.", code: "LOCKED" }, { status: 409 });
  }
  const updated = await prisma.job.update({ where: { id }, data: parsed.data });
  for (const bid of job.bids) {
    await notify({
      userId: bid.provider.userId,
      type: "STATUS_UPDATE",
      title: "The customer updated a request you bid on",
      body: `"${updated.title}" was changed. Check the details and update your bid if needed.`,
      linkUrl: `/pro/jobs/${id}`,
    }).catch(() => null);
  }
  return NextResponse.json({ ok: true, job: { id: updated.id, title: updated.title, description: updated.description, budgetPKR: updated.budgetPKR, areaLabel: updated.areaLabel } });
}
