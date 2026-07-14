import { Eyebrow } from "@/components/landing/Eyebrow";

const PROBLEMS = [
  "Calling 6 numbers from a WhatsApp group and hoping",
  '"App said PKR 1,500 — the guy on-site demanded 4,000"',
  "No idea if he's actually coming or when",
  "Cash paid, work half-done, number blocked",
  "Zero recourse when it breaks again next week",
];

export function Problem() {
  return (
    <section className="section mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>The Problem</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">
          FINDING A GOOD MISTRI SHOULDN&apos;T BE A GAMBLE.
        </h2>
      </div>
      <div className="border-t border-border-subtle">
        {PROBLEMS.map((p) => (
          <div key={p} className="flex items-center gap-4.5 border-b border-border-subtle py-5.5 text-lg text-text-muted">
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-danger/10 text-[15px] font-extrabold text-danger">
              ✕
            </span>
            {p}
          </div>
        ))}
      </div>
      <p className="mt-8 font-display text-xl font-bold text-accent">
        Servigic fixes all five — with bidding, Payment Protection, and live tracking.
      </p>
    </section>
  );
}
