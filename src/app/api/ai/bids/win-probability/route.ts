import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getBidWinProbability } from "@/lib/aiService";
import { getFeatureFlags } from "@/lib/featureFlags";
import { haversineKm } from "@/lib/geo";

const schema = z.object({ jobId: z.string().cuid(), pricePKR: z.number().int().min(1), etaMinutes: z.number().int().min(1) });

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const flags = await getFeatureFlags();
  if (!flags.aiBidWinHint) {
    return NextResponse.json({ error: "Bid-win hint is disabled" }, { status: 503 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id: parsed.data.jobId } }),
    prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } }),
  ]);
  if (!job || !profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const categoryAvg = await prisma.bid.aggregate({
    where: { job: { categoryId: job.categoryId } },
    _avg: { pricePKR: true },
  });
  const categoryAvgPricePKR = Math.round(categoryAvg._avg.pricePKR ?? parsed.data.pricePKR);

  const distanceKm = profile.baseLat && profile.baseLng ? haversineKm(job.lat, job.lng, profile.baseLat, profile.baseLng) : 5;

  const result = await getBidWinProbability({
    pricePKR: parsed.data.pricePKR,
    categoryAvgPricePKR,
    etaMinutes: parsed.data.etaMinutes,
    providerRatingAvg: profile.ratingAvg || 4,
    providerJobsCompleted: profile.jobsCompleted,
    distanceKm,
  });

  if (!result) {
    return NextResponse.json({ error: "Bid-win hint is not available right now" }, { status: 503 });
  }
  return NextResponse.json(result);
}
