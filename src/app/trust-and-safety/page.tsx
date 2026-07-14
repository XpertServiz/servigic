import type { Metadata } from "next";
import { InfoPageShell } from "@/components/landing/InfoPageShell";

export const metadata: Metadata = { title: "Trust & Safety | Servigic" };

export default function TrustAndSafetyPage() {
  return (
    <InfoPageShell eyebrow="Trust & Safety" title="Built on Payment Protection, Verification, and Masking.">
      <div>
        <h2>Payment Protection</h2>
        <p>
          Your payment is held by Servigic — never sent directly to the provider — until you confirm the job is done.
          Every job carries a 7-day workmanship warranty.
        </p>
      </div>
      <div>
        <h2>Contact Masking</h2>
        <p>
          Phone numbers and exact addresses stay hidden on both sides until payment is verified. Providers appear as
          an anonymous serial number (&quot;Pro #42&quot;) and customers by first name and area only, until then.
        </p>
      </div>
      <div>
        <h2>Provider Verification Ladder</h2>
        <p>
          Level 1: CNIC + selfie, admin-approved — can bid. Level 2 &quot;Verified Pro&quot;: police verification
          certificate, priority dispatch. Level 3 &quot;Gold Ustad&quot;: 10 completed jobs at 4.5★ or higher, lowest
          commission.
        </p>
      </div>
      <div>
        <h2>Change Orders</h2>
        <p>
          If a provider finds extra work on-site, they submit a Change Order with a photo and price — you approve
          (and pay the difference into Payment Protection) before any extra work happens.
        </p>
      </div>
      <div>
        <h2>Disputes</h2>
        <p>
          If something&apos;s wrong, open a dispute before confirming — funds freeze, you and the provider submit
          photos, and our team resolves it: release, partial refund, or full refund.
        </p>
      </div>
      <div>
        <h2>Platform-Only Rule</h2>
        <p>
          Providers agree that jobs found through Servigic close on Servigic. Taking a customer off-platform after a
          lead is grounds for delisting — this keeps Payment Protection meaningful for everyone.
        </p>
      </div>
    </InfoPageShell>
  );
}
