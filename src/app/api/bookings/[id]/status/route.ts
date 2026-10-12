import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { bookingStatusSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";
import { getPaymentMode } from "@/lib/featureFlags";
import { applyAdDiscountToBooking } from "@/lib/rewards";

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: "ON_MY_WAY",
  ON_MY_WAY: "ARRIVED",
  ARRIVED: "WORKING",
  WORKING: "DONE",
};

const STATUS_MESSAGE: Record<string, string> = {
  ON_MY_WAY: "is on the way",
  ARRIVED: "has arrived",
  WORKING: "started working",
  DONE: "marked the job done — please confirm to release payment",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = bookingStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.providerUserId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (NEXT_STATUS[booking.status] !== parsed.data.status) {
    return NextResponse.json({ error: `Cannot move from ${booking.status} to ${parsed.data.status}` }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: parsed.data.status,
      timeline: { ...(booking.timeline as object), [parsed.data.status]: new Date().toISOString() },
    },
  });

  // Customer ad-reward: the oldest unused PKR 50 credit is applied to the first
  // booking that reaches DONE (cash-after-job mode only). It is funded from
  // Servigic's commission, so the pro's net is unchanged.
  let discountPKR = 0;
  if (parsed.data.status === "DONE" && (await getPaymentMode()) === "CASH_WALLET") {
    discountPKR = await applyAdDiscountToBooking({ id: booking.id, customerId: booking.customerId, commissionPKR: booking.commissionPKR });
  }

  await notify({
    userId: booking.customerId,
    type: "STATUS_UPDATE",
    title: `Your pro ${STATUS_MESSAGE[parsed.data.status]}`,
    body:
      parsed.data.status === "DONE"
        ? discountPKR > 0
          ? `Your ad reward took PKR ${discountPKR} off - pay PKR ${(booking.totalPKR - discountPKR).toLocaleString()} and confirm the job is done.`
          : "Confirm the job is done to release payment."
        : "Track live on your booking page.",
    linkUrl: `/bookings/${id}`,
    channels: ["whatsapp"],
  });

  return NextResponse.json({ booking: updated });
}
