import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { declineBidSchema } from "@/lib/validation/bid";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = declineBidSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const bid = await prisma.bid.findUnique({ where: { id }, include: { job: true } });
  if (!bid || bid.job.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }
  if (bid.status !== "PENDING") {
    return NextResponse.json({ error: "This bid can no longer be declined" }, { status: 400 });
  }

  const declineReason = parsed.data.note ? `${parsed.data.reason}: ${parsed.data.note}` : parsed.data.reason;

  const updated = await prisma.bid.update({
    where: { id },
    data: { status: "DECLINED", declineReason },
  });

  await notify({
    userId: bid.userId,
    type: "BID_DECLINED",
    title: "Bid not selected",
    body: `Reason: ${declineReason}`,
    linkUrl: `/pro/jobs/${bid.jobId}`,
  });

  return NextResponse.json({ bid: updated });
}
