import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

// The customer cancels a request before accepting any bid. Free of charge. Pros who bid are told. After a bid is accepted
// the request cannot be cancelled here: the booking has its own cancellation (with its rules) and chat with the pro.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id }, include: { booking: { select: { id: true } }, bids: { where: { status: { in: ["PENDING", "COUNTERED"] } }, select: { id: true, provider: { select: { userId: true } } } } } });
  if (!job || job.customerId !== auth.session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.booking) return NextResponse.json({ error: "A pro is already booked. Cancel the booking instead (its cancellation rules apply), or message your pro.", code: "BOOKED", bookingId: job.booking.id }, { status: 409 });
  if (job.status !== "OPEN" && job.status !== "EXPIRED") return NextResponse.json({ error: "This request can no longer be cancelled.", code: "NOT_CANCELLABLE" }, { status: 400 });
  await prisma.$transaction([
    prisma.job.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.bid.updateMany({ where: { id: { in: job.bids.map((b) => b.id) } }, data: { status: "DECLINED" } }),
  ]);
  for (const bid of job.bids) {
    await notify({ userId: bid.provider.userId, type: "BID_DECLINED", title: "Request cancelled by the customer", body: `"${job.title}" was cancelled, so your bid is closed.`, linkUrl: "/pro/jobs" }).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
