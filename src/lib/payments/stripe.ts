import Stripe from "stripe";

// Automated PSP path (Master Brief §5, §11: "later phase: automated PSP...
// Stripe international"). Only active when STRIPE_SECRET_KEY is set — the
// manual JazzCash/EasyPaisa/bank-transfer + admin-verify flow (already
// built, see /api/bookings/[id]/payment) stays the default for Pakistan
// launch and keeps working unconditionally either way.
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
