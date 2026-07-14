import { Eyebrow } from "@/components/landing/Eyebrow";

export function Features() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12">
      {/* The Bid Board */}
      <div className="grid grid-cols-1 items-center gap-16 border-t border-border-subtle py-20 md:grid-cols-2">
        <div>
          <Eyebrow>The Bid Board</Eyebrow>
          <h3 className="mb-4 font-display text-[clamp(26px,3.4vw,38px)] font-bold uppercase">Pros compete. You win.</h3>
          <p className="mb-2 text-text-muted">Every bid shows price, rating, distance and ETA — sorted however you like.</p>
          <p className="text-text-muted">Don&apos;t like a bid? Decline with a reason, or send a counter-offer.</p>
        </div>
        <div className="min-h-[260px] rounded-[18px] border border-border-subtle bg-bg-elevated p-6">
          <div className="mb-4 flex gap-2">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">Price</span>
            <span className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] font-bold text-text-muted">Rating</span>
            <span className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] font-bold text-text-muted">ETA</span>
          </div>
          {[
            { name: "Electrician Pro #17", meta: "★4.9 · 40 min ETA", price: "PKR 1,600" },
            { name: "Haider K.", meta: "★4.7 · 55 min ETA", price: "PKR 1,850" },
          ].map((b) => (
            <div key={b.name} className="mb-2.5 flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-3 py-2.5">
              <div>
                <div className="text-[13px] font-bold">{b.name}</div>
                <div className="text-[11px] text-text-muted">{b.meta}</div>
              </div>
              <div className="text-sm font-extrabold text-accent">{b.price}</div>
            </div>
          ))}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {["Too expensive", "ETA too long", "Low rating"].map((c) => (
              <span key={c} className="rounded-full border border-border-subtle px-2 py-1 text-[10px] text-text-muted">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Protection Shield */}
      <div className="grid grid-cols-1 items-center gap-16 border-t border-border-subtle py-20 md:grid-cols-2">
        <div>
          <Eyebrow tone="secondary">Payment Protection</Eyebrow>
          <h3 className="mb-4 font-display text-[clamp(26px,3.4vw,38px)] font-bold uppercase">
            Your money doesn&apos;t move until the job is done.
          </h3>
          <p className="mb-2 text-text-muted">Paid → Held → Job Done → Released. Every job carries a 7-day workmanship warranty.</p>
          <p className="text-text-muted">Extra work found on-site? A Change Order needs your approval first — or it doesn&apos;t happen.</p>
        </div>
        <div className="min-h-[260px] rounded-[18px] border border-border-subtle bg-bg-elevated p-6">
          <div className="mb-5 flex justify-between">
            {["Paid", "Held", "Job Done", "Released"].map((s, i) => (
              <div key={s} className="relative flex-1 text-center">
                <div className="mx-auto mb-2 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-secondary text-[13px] font-extrabold text-secondary-foreground">
                  {i === 2 ? "✓" : i === 3 ? "💸" : "🔒"}
                </div>
                <span className="text-[11px] text-text-muted">{s}</span>
              </div>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary">
            🛡 7-Day Workmanship Warranty
          </div>
          <div className="mt-4 rounded-[10px] border border-border-subtle bg-bg-elevated-2 p-3.5 text-xs text-text-muted">
            Change Order: &quot;Found corroded pipe — extra PKR 800&quot; <b className="text-secondary">Approve</b>
          </div>
        </div>
      </div>

      {/* Live Tracking */}
      <div className="grid grid-cols-1 items-center gap-16 border-t border-border-subtle py-20 md:grid-cols-2">
        <div>
          <Eyebrow>Live Tracking</Eyebrow>
          <h3 className="mb-4 font-display text-[clamp(26px,3.4vw,38px)] font-bold uppercase">Know exactly where your pro is.</h3>
          <p className="text-text-muted">Uber-style live map from the moment your pro accepts the job.</p>
        </div>
        <div className="min-h-[260px] rounded-[18px] border border-border-subtle bg-bg-elevated p-6">
          <div className="relative mb-4 h-[150px] overflow-hidden rounded-xl bg-[repeating-linear-gradient(45deg,#14161d_0_2px,#0d0f14_2px_20px)]">
            <span className="absolute left-[60%] top-[30%] h-3.5 w-3.5 rounded-full bg-accent shadow-[0_0_0_6px_var(--accent-glow)]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["On the way", "Arrived", "Working", "Done"].map((s, i) => (
              <span
                key={s}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                  i === 0 ? "border-accent text-accent" : "border-border-subtle text-text-muted"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-text-muted">Ahmed is on the way · ETA 35 min</p>
        </div>
      </div>

      {/* Verified Pros */}
      <div className="grid grid-cols-1 items-center gap-16 border-t border-border-subtle py-20 md:grid-cols-2">
        <div>
          <Eyebrow>Verified Pros, Rated Both Ways</Eyebrow>
          <h3 className="mb-4 font-display text-[clamp(26px,3.4vw,38px)] font-bold uppercase">
            CNIC-verified. Police-checked at Level 2.
          </h3>
          <p className="text-text-muted">Rated by real customers after real jobs — and pros rate customers too.</p>
        </div>
        <div className="min-h-[260px] rounded-[18px] border border-border-subtle bg-bg-elevated p-6">
          <div className="mb-3.5 flex gap-2">
            <span className="rounded-lg border border-border-subtle bg-bg-elevated-2 px-2.5 py-1.5 text-[11px] font-bold text-text-muted">
              Verified
            </span>
            <span className="rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-bold text-accent-foreground">Verified Pro</span>
            <span className="rounded-lg border border-border-subtle bg-bg-elevated-2 px-2.5 py-1.5 text-[11px] font-bold text-text-muted">
              Gold Ustad
            </span>
          </div>
          <div className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 p-3.5 text-xs text-text-muted">
            Ahmed R. · ★4.9 · 212 jobs completed
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Professional", "On time", "Clean work"].map((t) => (
              <span key={t} className="rounded-full border border-border-subtle px-2 py-1 text-[10px] text-text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
