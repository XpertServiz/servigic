import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createJobSchema } from "@/lib/validation/job";
import { encodeGeohash, haversineKm } from "@/lib/geo";
import { dispatchJob } from "@/lib/dispatch";
import { runExpirySweep } from "@/lib/expiry";

const EMERGENCY_BIDDING_WINDOW_MIN = 30;
const STANDARD_BIDDING_WINDOW_HOURS = 24;

// A customer may run several requests at once (reverse-marketplace model, not
// single-dispatch) — this is only an abuse guard. Overridable per deployment;
// confirm the final number with the founder before relying on the default.
const MAX_OPEN_JOBS_PER_CUSTOMER = Number(process.env.MAX_OPEN_JOBS_PER_CUSTOMER) || 5;
// Two posts in the same category closer than this are treated as the same
// address for the soft duplicate prompt.
const DUPLICATE_RADIUS_KM = 0.3;

function normalizeAddress(address: string) {
  return address.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { allowDuplicate, ...data } = parsed.data;

  // Soft cap + soft duplicate detection. Neither blocks posting outright
  // beyond the cap: the duplicate case returns a 409 the app turns into a
  // non-blocking "edit that one instead?" prompt, and re-sends with
  // allowDuplicate=true if the customer really wants a second request.
  const openJobs = await prisma.job.findMany({
    where: { customerId: auth.session.user.id, status: "OPEN", biddingClosesAt: { gt: new Date() } },
    select: { id: true, title: true, categoryId: true, lat: true, lng: true, exactAddress: true },
  });

  if (openJobs.length >= MAX_OPEN_JOBS_PER_CUSTOMER) {
    return NextResponse.json(
      {
        error: `You can have up to ${MAX_OPEN_JOBS_PER_CUSTOMER} open requests at a time. Close or complete one first, or contact support to raise the limit.`,
        code: "OPEN_JOB_LIMIT",
      },
      { status: 429 }
    );
  }

  if (!allowDuplicate) {
    const normalizedNew = normalizeAddress(data.exactAddress);
    const duplicate = openJobs.find(
      (j) =>
        j.categoryId === data.categoryId &&
        (haversineKm(j.lat, j.lng, data.lat, data.lng) <= DUPLICATE_RADIUS_KM || normalizeAddress(j.exactAddress) === normalizedNew)
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error: "You already have an open request of this type nearby.",
          code: "DUPLICATE_OPEN_JOB",
          existingJob: { id: duplicate.id, title: duplicate.title },
        },
        { status: 409 }
      );
    }
  }

  const biddingClosesAt =
    data.urgency === "EMERGENCY"
      ? new Date(Date.now() + EMERGENCY_BIDDING_WINDOW_MIN * 60 * 1000)
      : new Date(Date.now() + STANDARD_BIDDING_WINDOW_HOURS * 60 * 60 * 1000);

  const job = await prisma.job.create({
    data: {
      customerId: auth.session.user.id,
      categoryId: data.categoryId,
      subServiceId: data.subServiceId,
      title: data.title,
      description: data.description,
      photos: data.photos,
      urgency: data.urgency,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      city: data.city,
      areaLabel: data.areaLabel,
      exactAddress: data.exactAddress,
      lat: data.lat,
      lng: data.lng,
      geohash: encodeGeohash(data.lat, data.lng),
      budgetPKR: data.budgetPKR,
      biddingClosesAt,
    },
  });

  const dispatchedCount = await dispatchJob(job);

  return NextResponse.json({ job, dispatchedCount: dispatchedCount ?? 0 });
}

export async function GET(req: Request) {
  const session = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!session.ok) return session.response;

  await runExpirySweep();

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "mine";

  if (scope === "mine" && session.session.user.role === "CUSTOMER") {
    const jobs = await prisma.job.findMany({
      where: { customerId: session.session.user.id },
      orderBy: { createdAt: "desc" },
      include: { category: true, _count: { select: { bids: true } } },
    });
    return NextResponse.json({ jobs });
  }

  return NextResponse.json({ jobs: [] });
}
