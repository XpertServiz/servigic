import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "DONE") {
    return NextResponse.json({ error: "This job hasn't been marked done yet" }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: "COMPLETED", timeline: { ...(booking.timeline as object), COMPLETED: new Date().toISOString() } },
    }),
    prisma.job.update({ where: { id: booking.jobId }, data: { status: "COMPLETED" } }),
    prisma.providerProfile.update({ where: { id: booking.providerId }, data: { jobsCompleted: { increment: 1 } } }),
    prisma.payout.upsert({
      where: { bookingId: id },
      update: {},
      create: { bookingId: id, providerId: booking.providerId, amountPKR: booking.payoutPKR, method: "EASYPAISA" },
    }),
  ]);

  await notify({
    userId: booking.providerUserId,
    type: "JOB_COMPLETED",
    title: "Job confirmed complete — payout queued",
    body: `PKR ${booking.payoutPKR.toLocaleString()} will be sent to your payout account.`,
    linkUrl: `/pro/earnings`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ booking: updated });
}
