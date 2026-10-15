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
  if (profile.dispatchStatus === "SUSPENDED") {
    return NextResponse.json(
      { error: "Dispatch paused — settle your wallet balance or resolve your cancellation rate to resume" },
      { status: 403 }
    );
  }

  if (profile.activation === "WAITING") {
    return NextResponse.json(
      { error: "You're approved, but jobs haven't opened for your area or trade yet. We'll notify you as soon as they do.", code: "PRO_WAITING" },
      { status: 403 }
    );
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "This job is no longer accepting bids" }, { status: 400 });
  }

  const safeMessage = message ? scrubContactInfo(message) : undefined;

  const alreadyBid = await prisma.bid.findUnique({ where: { jobId_providerId: { jobId, providerId: profile.id } }, select: { id: true } });
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

  // The customer's phone rings (own channel + sound) for the FIRST bid only. Later bids update the running count
  // on a quiet channel ("3 pros have bid") so a busy job does not ring again and again. A pro editing an existing
  // bid does not notify the customer again at all.
  if (!alreadyBid) {
    const totalBids = await prisma.bid.count({ where: { jobId, status: { in: ["PENDING", "COUNTERED"] } } });
    const first = totalBids <= 1;
    await notify({
      userId: job.customerId,
      type: "BID_RECEIVED",
      title: first ? "A pro has bid on your job" : `${totalBids} pros have bid on your job`,
      body: first ? `PKR ${pricePKR.toLocaleString()} · ETA ${etaMinutes} min - tap to review` : "Tap to compare prices and choose your pro",
      linkUrl: `/jobs/${jobId}`,
      pushChannelHint: first ? "BID_FIRST" : "BID_MORE",
      pushData: { jobId, bidCount: totalBids },
    });
  }

  return NextResponse.json({ bid });
}
