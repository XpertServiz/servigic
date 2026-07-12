import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { EarningsCalculator } from "@/components/landing/EarningsCalculator";

export const metadata: Metadata = {
  title: "Become a Servigic Pro — No Lead Fees, Ever",
  description: "Join Servigic as a verified service provider. No lead fees — pay only when you win the job. Uber-style job alerts, paid straight to EasyPaisa/JazzCash/bank.",
};

const LADDER = [
  { level: "Level 1", title: "Approved", desc: "CNIC + selfie uploaded, admin-approved. You can bid on jobs.", commission: "12%" },
  { level: "Level 2", title: "Verified Pro", desc: "Police verification certificate. Priority dispatch + badge on your bid cards.", commission: "11%" },
  { level: "Level 3", title: "Gold Ustad", desc: "10 completed jobs at 4.5★ or higher.", commission: "10%" },
];

export default function ProLandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-[radial-gradient(ellipse_70%_60%_at_30%_0%,rgba(255,176,32,.16),transparent_60%)] px-6 py-24 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent">For Pros</p>
          <h1 className="mx-auto max-w-3xl font-display text-[clamp(36px,7vw,64px)] font-bold uppercase leading-[1.05]">
            No Lead Fees. <span className="text-accent">Ever.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-text-muted">
            Pay only when you win the job. Uber-style alerts in your pocket. Paid straight to EasyPaisa, JazzCash, or bank.
          </p>
          <Button href="/signup?role=provider" size="lg" className="mt-8">
            Become a Servigic Pro →
          </Button>
        </section>

        <section className="mx-auto max-w-[1000px] px-6 py-20" id="earnings">
          <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase">Earnings Calculator</h2>
          <div className="mx-auto max-w-md rounded-[16px] border border-accent/30 bg-bg-elevated p-8">
            <EarningsCalculator />
          </div>
        </section>

        <section className="mx-auto max-w-[900px] px-6 py-20">
          <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase">Verification Ladder</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {LADDER.map((l) => (
              <div key={l.level} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">{l.level}</div>
                <h3 className="mb-2 text-lg font-bold">{l.title}</h3>
                <p className="mb-4 text-sm text-text-muted">{l.desc}</p>
                <div className="font-display text-2xl font-bold text-secondary">{l.commission}</div>
                <div className="text-xs text-text-muted">commission</div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-20 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold uppercase">Ready to start earning?</h2>
          <Button href="/signup?role=provider" size="lg">
            Become a Servigic Pro →
          </Button>
        </section>
      </main>
      <Footer />
    </>
  );
}
