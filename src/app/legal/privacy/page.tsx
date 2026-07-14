import type { Metadata } from "next";
import { InfoPageShell } from "@/components/landing/InfoPageShell";

export const metadata: Metadata = { title: "Privacy Policy | Servigic" };

export default function PrivacyPage() {
  return (
    <InfoPageShell eyebrow="Legal" title="Privacy Policy">
      <p className="rounded-[10px] border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        Draft placeholder — have this reviewed by a lawyer licensed in your launch markets before going live,
        especially for GCC/EU/CA data-protection rules once those markets open.
      </p>
      <div>
        <h2>Data We Collect</h2>
        <p>Account details (name, phone, email), job details and photos, location while a job is ON_MY_WAY, KYC documents for providers, and payment proof screenshots.</p>
      </div>
      <div>
        <h2>How We Use It</h2>
        <p>To operate the marketplace: matching jobs to providers, verifying identity, processing payments, and sending job-related notifications.</p>
      </div>
      <div>
        <h2>Location Data</h2>
        <p>Provider location is only shared with the matched customer, only while status is ON_MY_WAY, and pings are retained for 7 days.</p>
      </div>
      <div>
        <h2>Lead Data (Providers)</h2>
        <p>Business contact information sourced from public listings (e.g. Google Places) is used only for B2B recruiting outreach in Pakistan, with opt-out honored on request.</p>
      </div>
    </InfoPageShell>
  );
}
