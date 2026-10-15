import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { acceptBid } from "@/lib/acceptBid";

// Confirm a pro bid on the customer behalf, for jobs an admin posted. The admin must state that the
// customer agreed (by phone / WhatsApp); the booking records which admin confirmed it.
const schema = z.object({
  bidId: z.string().min(1),
  customerAgreed: z.literal(true, { message: "Confirm that the customer agreed to this pro" }),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const bid = await prisma.bid.findUnique({
    where: { id: parsed.data.bidId },
    include: { job: { select: { id: true, customerId: true, postedByAdminId: true } } },
  });
  if (!bid || bid.jobId !== id) return NextResponse.json({ error: "Bid not found on this job" }, { status: 404 });
  // Only jobs an admin posted: an admin never accepts bids on a job a customer posted themselves.
  if (!bid.job.postedByAdminId) {
    return NextResponse.json({ error: "This job was posted by the customer, only they can confirm a bid" }, { status: 403 });
  }

  const result = await acceptBid(bid.id, bid.job.customerId, { adminId: auth.session.user.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ booking: result.booking });
}
