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
    desc: "Money is held safely until the job is done; watch your pro drive to you Uber-style; released only when you confirm.",
    mock: "🔒 Payment Protected · Ahmed is on the way · ETA 35 min",
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

      <div className="mt-8 rounded-[14px] border border-accent bg-accent/[0.06] p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">For Emergencies</p>
        <h3 className="mb-2.5 text-xl font-bold">Or Skip the Wait — Instant Match</h3>
        <p className="mb-5 max-w-2xl text-[15px] text-text-muted">
          Burst pipe at 2am? Get matched to the nearest verified pro in seconds — still fully Payment Protected. No
          waiting for bids to come in.
        </p>
        <div className="rounded-[10px] border border-accent/30 bg-bg-elevated-2 p-3.5 text-xs text-text-muted">
          🚨 Instant Match · Ahmed (Verified Pro, 4.8★) · PKR 2,875 · ETA 12 min · 90s to accept
        </div>
      </div>
    </section>
  );
}
