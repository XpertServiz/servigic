import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { counterBidSchema } from "@/lib/validation/bid";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = counterBidSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const bid = await prisma.bid.findUnique({ where: { id }, include: { job: true } });
  if (!bid || bid.job.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }
  if (bid.status !== "PENDING") {
    return NextResponse.json({ error: "This bid can no longer be countered" }, { status: 400 });
  }
  if (bid.counterPricePKR !== null) {
    return NextResponse.json({ error: "You've already sent one counter-offer for this bid" }, { status: 400 });
  }

  const updated = await prisma.bid.update({
    where: { id },
    data: { status: "COUNTERED", counterPricePKR: parsed.data.counterPricePKR },
  });

  await notify({
    userId: bid.userId,
    type: "BID_COUNTERED",
    title: "Customer sent a counter-offer",
    body: `PKR ${parsed.data.counterPricePKR.toLocaleString()} (your bid was PKR ${bid.pricePKR.toLocaleString()})`,
    linkUrl: `/pro/jobs/${bid.jobId}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ bid: updated });
}
