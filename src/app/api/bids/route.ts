import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { upsertBidSchema } from "@/lib/validation/bid";
import { scrubContactInfo } from "@/lib/scrub";
import { notify } from "@/lib/notify";

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = upsertBidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { jobId, pricePKR, etaMinutes, message, estimatedPartsNote } = parsed.data;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile || profile.verificationLevel < 1) {
    return NextResponse.json({ error: "Complete verification before bidding" }, { status: 403 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "This job is no longer accepting bids" }, { status: 400 });
  }

  const safeMessage = message ? scrubContactInfo(message) : undefined;

  const bid = await prisma.bid.upsert({
    where: { jobId_providerId: { jobId, providerId: profile.id } },
    update: { pricePKR, etaMinutes, message: safeMessage, estimatedPartsNote, status: "PENDING" },
    create: {
      jobId,
      providerId: profile.id,
      userId: auth.session.user.id,
      pricePKR,
      etaMinutes,
      message: safeMessage,
      estimatedPartsNote,
    },
  });

  await notify({
    userId: job.customerId,
    type: "BID_RECEIVED",
    title: "New bid on your job",
    body: `PKR ${pricePKR.toLocaleString()} · ETA ${etaMinutes} min`,
    linkUrl: `/jobs/${jobId}`,
  });

  return NextResponse.json({ bid });
}
