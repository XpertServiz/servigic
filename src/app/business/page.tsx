import type { Metadata } from "next";
import { InfoPageShell } from "@/components/landing/InfoPageShell";
import { WaitlistForm } from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Servigic for Business — Multi-Property Maintenance | Servigic",
  description:
    "One dashboard for every unit, every trade. Bulk job posting and consolidated invoicing for property managers, villa management companies, and community associations.",
};

export default function BusinessPage() {
  return (
    <InfoPageShell eyebrow="Servigic for Business" title="One dashboard. Every unit. Every trade.">
      <p>
        Managing maintenance across multiple properties means chasing different mistris for every unit, every trade,
        every month. Servigic for Business brings it under one roof — post once, dispatch across all your properties,
        and get one consolidated bill instead of a dozen separate payments.
      </p>
      <p>
        Built for villa management companies, condo and apartment complex managers, and DHA-style community
        management — the same Payment Protection and verified-pro network as every other Servigic job, just organized
        for scale.
      </p>
      <p className="text-sm text-text-dim">
        This is early — we&apos;re building the full multi-property dashboard now. Leave your details below and
        we&apos;ll reach out when it&apos;s ready for your portfolio.
      </p>
      <WaitlistForm />
    </InfoPageShell>
  );
}
