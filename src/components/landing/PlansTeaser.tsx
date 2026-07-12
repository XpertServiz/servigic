import Link from "next/link";
import { Eyebrow } from "@/components/landing/Eyebrow";

interface PlanTeaserCard {
  icon: string;
  title: string;
  cadence: string;
  fromPKR: number;
}

export function PlansTeaser({ cards }: { cards: PlanTeaserCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1000px] px-6 py-20">
      <Eyebrow>Set It &amp; Forget It</Eyebrow>
      <h2 className="mb-8 font-display text-[clamp(28px,4.5vw,44px)] font-bold uppercase leading-tight">
        Never miss your AC service again.
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
            <div className="mb-2 text-2xl">{c.icon}</div>
            <h3 className="mb-1 text-lg font-bold">{c.title}</h3>
            <p className="mb-4 text-sm text-text-muted">{c.cadence}</p>
            <div className="font-display text-xl font-bold text-accent">From PKR {c.fromPKR.toLocaleString()}/visit</div>
          </div>
        ))}
      </div>
      <Link
        href="/signup?role=customer"
        className="inline-block rounded-[10px] bg-accent px-6 py-3 font-bold text-accent-foreground"
      >
        Set Up a Plan →
      </Link>
    </section>
  );
}
