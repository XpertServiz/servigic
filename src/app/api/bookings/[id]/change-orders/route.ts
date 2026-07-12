import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { proposeChangeOrderSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";

const IN_PROGRESS_STATUSES = ["ON_MY_WAY", "ARRIVED", "WORKING"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = proposeChangeOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.providerUserId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!IN_PROGRESS_STATUSES.includes(booking.status)) {
    return NextResponse.json({ error: "Can only propose extra work while the job is in progress" }, { status: 400 });
  }

  const changeOrder = await prisma.changeOrder.create({
    data: {
      bookingId: id,
      proposedById: auth.session.user.id,
      description: parsed.data.description,
      photoUrl: parsed.data.photoUrl,
      extraAmountPKR: parsed.data.extraAmountPKR,
    },
  });

  await notify({
    userId: booking.customerId,
    type: "STATUS_UPDATE",
    title: "Your pro proposed extra work",
    body: `${parsed.data.description} — PKR ${parsed.data.extraAmountPKR.toLocaleString()}`,
    linkUrl: `/bookings/${id}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ changeOrder });
}
