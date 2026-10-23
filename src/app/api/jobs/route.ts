import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createJobSchema } from "@/lib/validation/job";
import { haversineKm } from "@/lib/geo";
import { createAndDispatchJob } from "@/lib/jobCreate";
import { runExpirySweep } from "@/lib/expiry";
import { checkJobAvailability, getMarkets, placeJob } from "@/lib/marketConfig";

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
  const { allowDuplicate, ...raw } = parsed.data;
  // The real city and position of the job (the pin decides, unless it is the app's default position in another country).
  const placed = placeJob(await getMarkets(), raw.city, { lat: raw.lat, lng: raw.lng });
  const data = { ...raw, ...placed };

  // Market config (handoff section 11.6): reject posts for a category / area that is not switched on,
  // so a stale or modified app cannot bypass the admin launch settings.
  const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId }, select: { trade: true } });
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  const availability = await checkJobAvailability(data.city, category.trade, { lat: data.lat, lng: data.lng });
  if (!availability.ok) {
    return NextResponse.json({ error: availability.message, code: availability.code }, { status: 422 });
  }

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
        error: `You already have ${openJobs.length} of ${MAX_OPEN_JOBS_PER_CUSTOMER} open requests. Close or complete one before posting a new one.`,
        code: "OPEN_JOB_LIMIT",
        open: openJobs.length,
        max: MAX_OPEN_JOBS_PER_CUSTOMER,
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

  const { job, dispatchedCount } = await createAndDispatchJob(auth.session.user.id, data);

  return NextResponse.json({ job, dispatchedCount });
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
