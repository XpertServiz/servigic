import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { recomputeCancellationRate } from "@/lib/cancellationRate";
import { recomputeProviderStanding } from "@/lib/providerStanding";
import { cancelFeeRates, feeFor, FEE_WAIVED_REASONS } from "@/lib/cancelFee";

const CANCELLABLE_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED"];

const cancelSchema = z.object({
  reasonCode: z.enum([
    "CUSTOMER_CHANGED_MIND",
    "CUSTOMER_FOUND_ANOTHER_PRO",
    "CUSTOMER_PRICE_TOO_HIGH",
    "CUSTOMER_PRO_ASKED_TO_CANCEL",
    "CUSTOMER_PRO_LATE",
    "PROVIDER_CUSTOMER_NOT_AVAILABLE",
    "PROVIDER_UNAVAILABLE",
    "PROVIDER_JOB_TOO_FAR",
    "PROVIDER_PRICE_DISPUTE",
    "OTHER",
  ]),
  reasonNote: z.string().max(500).optional(),
  // The pro's proof when the customer was not there: where and when (his phone's position).
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
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
  const reason = parsed.data.reasonCode;
  if (reason === "PROVIDER_CUSTOMER_NOT_AVAILABLE" && (role !== "PROVIDER" || booking.status !== "ARRIVED")) {
    return NextResponse.json({ error: "This reason is only for a pro who has arrived and the customer is not there." }, { status: 400 });
  }
  // The fee: the customer cancelling after the pro left, or the pro reporting that the customer was not there. Not when the
  // pro caused it (asked the customer to cancel, was late) or when the pro himself cancels for his own reasons.
  const feeApplies = (role === "CUSTOMER" && !FEE_WAIVED_REASONS.includes(reason)) || reason === "PROVIDER_CUSTOMER_NOT_AVAILABLE";
  const feePKR = feeApplies ? feeFor(booking.status, booking.totalPKR, await cancelFeeRates()) : 0;
  const proof = reason === "PROVIDER_CUSTOMER_NOT_AVAILABLE" ? { at: new Date().toISOString(), status: booking.status, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null } : null;
  const isProAskedToCancel = role === "CUSTOMER" && parsed.data.reasonCode === "CUSTOMER_PRO_ASKED_TO_CANCEL";

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        timeline: { ...(booking.timeline as object), CANCELLED: new Date().toISOString() },
        ...(feePKR > 0 ? { cancelFeePKR: feePKR, cancelFeeStatus: "OWED" } : {}),
        ...(proof ? { cancelProof: proof } : {}),
      },
    }),
    prisma.job.update({ where: { id: booking.jobId }, data: { status: "OPEN" } }),
    prisma.cancellationEvent.create({
      data: {
        bookingId: id,
        cancelledById: auth.session.user.id,
        cancelledByRole: role,
        reasonCode: parsed.data.reasonCode,
        reasonNote: parsed.data.reasonNote,
        // A pro cancelling because the customer was not there is not held against the pro's cancellation rate.
        excludedFromCancellerRate: isProAskedToCancel || reason === "PROVIDER_CUSTOMER_NOT_AVAILABLE" || reason === "CUSTOMER_PRO_LATE",
        flaggedProviderId: isProAskedToCancel ? booking.providerId : undefined,
      },
    }),
    ...(feePKR > 0
      ? [
          prisma.user.update({
            where: { id: booking.customerId },
            data: { cancelFeeOwedPKR: { increment: feePKR }, lateCancelCount: { increment: 1 }, lastLateCancelAt: new Date() },
          }),
        ]
      : []),
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
    body:
      role === "CUSTOMER"
        ? feePKR > 0
          ? "The customer cancelled this booking after you left. A cancellation fee applies and your share is credited once it is paid."
          : "The customer cancelled this booking."
        : reason === "PROVIDER_CUSTOMER_NOT_AVAILABLE"
          ? "The pro reported that nobody was at the address. A cancellation fee may apply."
          : "The pro cancelled this booking.",
    linkUrl: role === "CUSTOMER" ? `/pro/bookings/${id}` : `/bookings/${id}`,
    channels: ["whatsapp"],
    // When the customer cancels, the pro hears the spoken "job cancelled" alert and the tap opens the booking.
    ...(role === "CUSTOMER" ? { pushChannelHint: "JOB_CANCELLED" } : {}),
    pushData: { bookingId: id },
  });

  // The customer is told about the fee right away (it must be cleared before the next request).
  if (feePKR > 0) {
    await notify({
      userId: booking.customerId,
      type: "STATUS_UPDATE",
      title: "Cancellation fee",
      body: `The pro had already ${booking.status === "ARRIVED" ? "arrived" : "left for you"}, so a cancellation fee of ${feePKR.toLocaleString()} applies. Please clear it with Servigic support to post new requests.`,
      linkUrl: `/bookings/${id}`,
      pushData: { bookingId: id },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, feePKR });
}
