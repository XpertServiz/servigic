import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
  if (!payment || payment.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Payment not awaiting verification" }, { status: 400 });
  }

  await prisma.payment.update({ where: { id }, data: { status: "REJECTED" } });

  await notify({
    userId: payment.booking.customerId,
    type: "PAYMENT_VERIFIED",
    title: "Payment proof rejected",
    body: "We couldn't verify your payment proof — please resubmit with a clearer screenshot.",
    linkUrl: `/bookings/${payment.bookingId}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ ok: true });
}
