import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { respondChangeOrderSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = respondChangeOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const changeOrder = await prisma.changeOrder.findUnique({ where: { id }, include: { booking: true } });
  if (!changeOrder || changeOrder.booking.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Change order not found" }, { status: 404 });
  }
  if (changeOrder.status !== "PENDING") {
    return NextResponse.json({ error: "This change order already has a response" }, { status: 400 });
  }

  const newStatus = parsed.data.action === "APPROVE" ? "AWAITING_PAYMENT" : "DECLINED";
  const updated = await prisma.changeOrder.update({
    where: { id },
    data: { status: newStatus, respondedAt: new Date() },
  });

  await notify({
    userId: changeOrder.proposedById,
    type: "STATUS_UPDATE",
    title: parsed.data.action === "APPROVE" ? "Extra work approved" : "Extra work declined",
    body:
      parsed.data.action === "APPROVE"
        ? "The customer approved your change order — waiting on their payment now."
        : "The customer declined your change order.",
    linkUrl: `/pro/bookings/${changeOrder.bookingId}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ changeOrder: updated });
}
