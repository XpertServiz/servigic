import type { Metadata } from "next";
import { InfoPageShell } from "@/components/landing/InfoPageShell";

export const metadata: Metadata = { title: "How It Works | Servigic" };

export default function HowItWorksPage() {
  return (
    <InfoPageShell eyebrow="How It Works" title="Post. Bid. Fix. Protected.">
      <div>
        <h2>01 — Post Your Job</h2>
        <p>
          Pick a category, describe the problem, add up to 6 photos, and set your urgency — Emergency, Today, or
          Scheduled. Your exact address is captured but stays hidden until payment.
        </p>
      </div>
      <div>
        <h2>02 — Pros Race to Bid</h2>
        <p>
          Every verified provider nearby who does that trade gets an instant alert — push notification, WhatsApp, and
          an in-app dispatch feed. They submit price, ETA, and a message. You compare side by side, sorted by price,
          rating, or ETA, and can decline with a reason or send one counter-offer per bid.
        </p>
      </div>
      <div>
        <h2>03 — Pay Safe, Track Live, Release</h2>
        <p>
          Accept a bid and pay the full amount into Servigic escrow via JazzCash, EasyPaisa, or bank transfer. Once
          our team verifies your payment proof, contact details and your exact address unlock, and in-app chat opens.
        </p>
      </div>
      <div>
        <h2>04 — Live Status</h2>
        <p>
          Watch your pro&apos;s status update in real time: On the Way → Arrived → Working → Done, with a live map
          while they&apos;re en route.
        </p>
      </div>
      <div>
        <h2>05 — Confirm &amp; Rate</h2>
        <p>
          Confirm the job is done (or it auto-confirms 24 hours after Done if there&apos;s no dispute) and payment
          releases to your pro minus Servigic&apos;s commission. Both sides rate each other.
        </p>
      </div>
    </InfoPageShell>
  );
}
