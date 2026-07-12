import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { payChangeOrderSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = payChangeOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const changeOrder = await prisma.changeOrder.findUnique({ where: { id }, include: { booking: true } });
  if (!changeOrder || changeOrder.booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Change order not found" }, { status: 404 });
  }
  if (changeOrder.status !== "AWAITING_PAYMENT") {
    return NextResponse.json({ error: "This change order isn't awaiting payment" }, { status: 400 });
  }

  const updated = await prisma.changeOrder.update({
    where: { id },
    data: { status: "PAID", paymentMethod: parsed.data.method, proofImageUrl: parsed.data.proofImageUrl },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.allSettled(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "PAYMENT_VERIFIED",
        title: "Change order payment awaiting verification",
        body: `PKR ${changeOrder.extraAmountPKR.toLocaleString()} for booking ${changeOrder.bookingId.slice(0, 8)}`,
        linkUrl: "/admin/payments",
      })
    )
  );

  return NextResponse.json({ changeOrder: updated });
}
