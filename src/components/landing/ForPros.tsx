import { Button } from "@/components/ui/Button";
import { EarningsCalculator } from "@/components/landing/EarningsCalculator";

const PERKS = [
  "No lead fees, ever",
  "Pay only when you win the job",
  "Uber-style job alerts in your pocket",
  "Paid straight to EasyPaisa / JazzCash / bank",
  "Badge levels = lower commission",
];

export function ForPros() {
  return (
    <section id="pros" className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-8">
          <h3 className="mb-4 text-xl font-bold">Customer?</h3>
          <p className="mb-5 text-sm text-text-muted">
            Post a job free, get bids in minutes, pay only into protected escrow.
          </p>
          <Button href="/signup?role=customer">Post a Job →</Button>
        </div>
        <div className="rounded-[14px] border border-accent/40 bg-gradient-to-br from-accent/[0.08] to-bg-elevated p-8">
          <h3 className="mb-4.5 font-display text-2xl font-bold uppercase">Earn more. Keep 88%.</h3>
          <ul className="mb-6 flex flex-col gap-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-text-muted">
                <b className="flex-none text-secondary">✓</b>
                {p}
              </li>
            ))}
          </ul>
          <EarningsCalculator />
          <Button href="/pro" className="w-full">
            Become a Servigic Pro →
          </Button>
        </div>
      </div>
    </section>
  );
}
