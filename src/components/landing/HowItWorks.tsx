import { Eyebrow } from "@/components/landing/Eyebrow";

const STEPS = [
  {
    num: "01",
    title: "Post Your Job",
    desc: "30 seconds. Photos + area. Your exact address stays hidden until you pay.",
    mock: "📷 3 photos · AC Technician · Gulshan-e-Iqbal · Emergency",
  },
  {
    num: "02",
    title: "Pros Race to Bid",
    desc: "Compare price, rating, ETA side by side — you choose, or counter-offer.",
    mock: "4 bids received · sorted by Price ↓",
  },
  {
    num: "03",
    title: "Pay Safe, Track Live, Release",
    desc: "Money sits in escrow; watch your pro drive to you Uber-style; released only when you confirm.",
    mock: "🔒 Held in escrow · Ahmed is on the way · ETA 35 min",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>How It Works</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">
          THREE STEPS. ZERO GAMBLING.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.num} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-8">
            <div className="font-display mb-2 text-[56px] font-bold text-border-subtle">{s.num}</div>
            <h3 className="mb-2.5 text-xl font-bold">{s.title}</h3>
            <p className="mb-5 text-[15px] text-text-muted">{s.desc}</p>
            <div className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 p-3.5 text-xs text-text-muted">
              {s.mock}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
