import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/payments/stripe";

// Infra for the P11 international PSP path (see GCC_EXPANSION.md) — not
// wired to Booking yet because every booking today is priced in PKR and
// Stripe isn't a live payment method for Pakistan. This becomes the entry
// point once a GCC/international currency booking flow exists: verify the
// signature, then move the matching Booking from PENDING_PAYMENT to
// CONFIRMED the same way /api/admin/payments/[id]/verify does today.
export async function POST(req: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    // TODO once international bookings exist: look up the Booking by
    // event.data.object.metadata.bookingId and confirm it, mirroring
    // src/app/api/admin/payments/[id]/verify/route.ts.
    console.log(`[stripe-webhook] ${event.type} — no booking to confirm yet (PKR-only launch)`);
  }

  return NextResponse.json({ received: true });
}
