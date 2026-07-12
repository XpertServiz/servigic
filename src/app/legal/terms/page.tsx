import type { Metadata } from "next";
import { InfoPageShell } from "@/components/landing/InfoPageShell";

export const metadata: Metadata = { title: "Terms of Service | Servigic" };

export default function TermsPage() {
  return (
    <InfoPageShell eyebrow="Legal" title="Terms of Service">
      <p className="rounded-[10px] border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        Draft placeholder — have this reviewed by a lawyer licensed in your launch markets before going live. It is
        not a substitute for legal advice.
      </p>
      <div>
        <h2>1. The Service</h2>
        <p>
          Servigic operates a marketplace connecting customers who need home services with independent service
          providers (&quot;pros&quot;). Servigic is not a party to the service agreement between customer and pro.
        </p>
      </div>
      <div>
        <h2>2. Escrow &amp; Payments</h2>
        <p>
          Customer payments are held by Servigic and released to the pro upon customer confirmation or
          auto-confirmation, less Servigic&apos;s commission, subject to the dispute process described in Trust &amp;
          Safety.
        </p>
      </div>
      <div>
        <h2>3. Provider Obligations</h2>
        <p>
          Pros must be truthful in their profile, licensed/qualified for the trades they bid on where required by
          law, and agree not to circumvent the platform for jobs originated on Servigic.
        </p>
      </div>
      <div>
        <h2>4. Limitation of Liability</h2>
        <p>Servigic is not liable for the quality of work performed by independent providers beyond the escrow and dispute process.</p>
      </div>
    </InfoPageShell>
  );
}
