import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const bid = await prisma.bid.findUnique({ where: { id }, include: { job: true, provider: true } });
  if (!bid || bid.provider.userId !== auth.session.user.id) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }
  if (bid.status !== "COUNTERED" || bid.counterPricePKR === null) {
    return NextResponse.json({ error: "No pending counter-offer on this bid" }, { status: 400 });
  }

  const updated =
    parsed.data.action === "accept"
      ? await prisma.bid.update({
          where: { id },
          data: { pricePKR: bid.counterPricePKR, counterPricePKR: null, status: "PENDING" },
        })
      : await prisma.bid.update({
          where: { id },
          data: { status: "DECLINED", declineReason: "Provider declined the counter-offer" },
        });

  await notify({
    userId: bid.job.customerId,
    type: parsed.data.action === "accept" ? "BID_RECEIVED" : "BID_DECLINED",
    title: parsed.data.action === "accept" ? "Pro accepted your counter-offer" : "Pro declined your counter-offer",
    body:
      parsed.data.action === "accept"
        ? `New price: PKR ${bid.counterPricePKR.toLocaleString()}`
        : "You can review the other bids on this job.",
    linkUrl: `/jobs/${bid.jobId}`,
  });

  return NextResponse.json({ bid: updated });
}
