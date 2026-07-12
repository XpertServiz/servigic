import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createJobSchema } from "@/lib/validation/job";
import { encodeGeohash } from "@/lib/geo";
import { dispatchJob } from "@/lib/dispatch";
import { runExpirySweep } from "@/lib/expiry";

const EMERGENCY_BIDDING_WINDOW_MIN = 30;
const STANDARD_BIDDING_WINDOW_HOURS = 24;

export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

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
