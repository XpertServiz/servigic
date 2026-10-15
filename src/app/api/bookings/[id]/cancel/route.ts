import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { recomputeCancellationRate } from "@/lib/cancellationRate";
import { recomputeProviderStanding } from "@/lib/providerStanding";

const CANCELLABLE_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED"];

const cancelSchema = z.object({
  reasonCode: z.enum([
    "CUSTOMER_CHANGED_MIND",
    "CUSTOMER_FOUND_ANOTHER_PRO",
    "CUSTOMER_PRICE_TOO_HIGH",
    "CUSTOMER_PRO_ASKED_TO_CANCEL",
    "PROVIDER_UNAVAILABLE",
    "PROVIDER_JOB_TOO_FAR",
    "PROVIDER_PRICE_DISPUTE",
    "OTHER",
  ]),
  reasonNote: z.string().max(500).optional(),
});

// Anti-Disintermediation System — shared cancel endpoint (v7 §2.3). No cancel
// endpoint existed before this addendum — one shared route (not two per
// role) handles both customer- and provider-initiated cancellation, avoiding
// duplicating the CancellationEvent-writing transaction, the rate-recompute
// call, and the "pro asked me to cancel" flagging logic.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isCustomer = booking.customerId === auth.session.user.id;
  const isProvider = booking.providerUserId === auth.session.user.id;
  if (!isCustomer && !isProvider) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: "This booking can no longer be cancelled — open a dispute instead" },
      { status: 400 }
    );
  }

  const parsed = cancelSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const role: "CUSTOMER" | "PROVIDER" = isCustomer ? "CUSTOMER" : "PROVIDER";
  // Customer-only special chip — a customer cancelling because their pro
  // asked them to is the classic bypass signal (v7 §2.1); flag the pro and
  // don't penalize the customer for reporting it.
  const isProAskedToCancel = role === "CUSTOMER" && parsed.data.reasonCode === "CUSTOMER_PRO_ASKED_TO_CANCEL";

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED", timeline: { ...(booking.timeline as object), CANCELLED: new Date().toISOString() } },
    }),
    prisma.job.update({ where: { id: booking.jobId }, data: { status: "OPEN" } }),
    prisma.cancellationEvent.create({
      data: {
        bookingId: id,
        cancelledById: auth.session.user.id,
        cancelledByRole: role,
        reasonCode: parsed.data.reasonCode,
        reasonNote: parsed.data.reasonNote,
        excludedFromCancellerRate: isProAskedToCancel,
        flaggedProviderId: isProAskedToCancel ? booking.providerId : undefined,
      },
    }),
    ...(isProAskedToCancel
      ? [
          prisma.providerFlag.create({
            data: {
              providerId: booking.providerId,
              customerId: booking.customerId,
              type: "MANUAL_ADMIN",
              evidence: { bookingId: id, reasonNote: parsed.data.reasonNote ?? null },
            },
          }),
        ]
      : []),
  ]);

  await Promise.all([
    recomputeCancellationRate(auth.session.user.id, role),
    role === "PROVIDER" ? recomputeProviderStanding(booking.providerId) : Promise.resolve(),
  ]);

  await notify({
    userId: role === "CUSTOMER" ? booking.providerUserId : booking.customerId,
    type: "STATUS_UPDATE",
    title: "Booking cancelled",
    body: role === "CUSTOMER" ? "The customer cancelled this booking." : "The pro cancelled this booking.",
    linkUrl: role === "CUSTOMER" ? `/pro/bookings/${id}` : `/bookings/${id}`,
    channels: ["whatsapp"],
    // When the customer cancels, the pro hears the spoken "job cancelled" alert and the tap opens the booking.
    ...(role === "CUSTOMER" ? { pushChannelHint: "JOB_CANCELLED" } : {}),
    pushData: { bookingId: id },
  });

  return NextResponse.json({ ok: true });
}
