import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { disputeSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || (booking.customerId !== auth.session.user.id && booking.providerUserId !== auth.session.user.id)) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!["DONE", "CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "COMPLETED"].includes(booking.status)) {
    return NextResponse.json({ error: "Cannot open a dispute on this booking" }, { status: 400 });
  }

  const [dispute] = await prisma.$transaction([
    prisma.dispute.create({
      data: { bookingId: id, openedById: auth.session.user.id, reason: parsed.data.reason, photos: parsed.data.photos },
    }),
    prisma.booking.update({ where: { id }, data: { status: "DISPUTED" } }),
  ]);

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.allSettled(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "DISPUTE_OPENED",
        title: "New dispute opened",
        body: parsed.data.reason.slice(0, 100),
        linkUrl: "/admin/disputes",
      })
    )
  );

  return NextResponse.json({ dispute });
}
