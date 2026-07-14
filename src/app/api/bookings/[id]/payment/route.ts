import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { submitPaymentSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = submitPaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "This booking is not awaiting payment" }, { status: 400 });
  }

  const payment = await prisma.payment.upsert({
    where: { bookingId: id },
    update: { method: parsed.data.method, proofImageUrl: parsed.data.proofImageUrl, status: "SUBMITTED" },
    create: {
      bookingId: id,
      amountPKR: booking.totalPKR,
      method: parsed.data.method,
      proofImageUrl: parsed.data.proofImageUrl,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.allSettled(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "PAYMENT_VERIFIED",
        title: "Payment proof submitted",
        body: `Booking ${id.slice(0, 8)} — PKR ${booking.totalPKR.toLocaleString()} awaiting verification.`,
        linkUrl: `/admin/payments`,
        // In-app + push alone aren't reliable for admin (no mobile app, no
        // push token) — email is the channel that actually reaches them
        // the instant a customer submits payment proof.
        channels: ["email"],
      })
    )
  );

  return NextResponse.json({ payment });
}
