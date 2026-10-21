import Link from "next/link";
import { TARGETS, toneFor, waitlistDemand, zoneStats, type Tone } from "@/lib/zoneStats";
import { TRADE_LABELS } from "@/lib/trades";

export const dynamic = "force-dynamic";

const TONE: Record<Tone, string> = {
  green: "border-secondary/40 bg-secondary/10 text-secondary",
  amber: "border-accent/40 bg-accent/10 text-accent",
  red: "border-danger/40 bg-danger/10 text-danger",
  none: "border-border-subtle text-text-muted",
};

function Metric({ label, value, tone, hint }: { label: string; value: string; tone: Tone; hint: string }) {
  return (
    <div className={`rounded-[12px] border p-3 ${TONE[tone]}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] opacity-70">{hint}</div>
    </div>
  );
}

const stage = (m: { enabled: boolean; status: string }) => (!m.enabled ? "Paused / planned" : m.status === "WAITLIST" ? "Recruiting" : "Live");

export default async function ZoneDashboardPage() {
  const [{ zones, foundingLeft, foundingSlots }, demand] = await Promise.all([zoneStats(), waitlistDemand()]);

  return (
    <div className="max-w-6xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Zone dashboard</h1>
      <p className="mb-6 max-w-3xl text-text-muted">
        Per zone and trade: how many leads were found, contacted, interested, registered, verified and active, against the target number of Pros (set per trade in <Link href="/admin/markets" className="text-accent underline">Markets &amp; Launch</Link>).
        Founding Pro places left: <b>{foundingLeft} of {foundingSlots}</b>.
      </p>

      {zones.length === 0 && <p className="text-text-muted">No zones yet. Draw one in Markets &amp; Launch.</p>}
      <div className="flex flex-col gap-6">
        {zones.map(({ zone, rows, gate }) => (
          <section key={zone.id} className="rounded-[16px] border border-border-subtle bg-bg-elevated/40 p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{zone.name} <span className="ms-2 rounded-full border border-border-subtle px-2 py-0.5 text-xs font-normal text-text-muted">{stage(zone)}</span></h2>
              <span className="text-xs text-text-muted">{zone.countryCode}{zone.cities.length ? ` · ${zone.cities.join(", ")}` : ""}</span>
            </div>

            <div className="overflow-x-auto rounded-[12px] border border-border-subtle">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
                  <tr><th className="p-3">Trade</th><th className="p-3">Leads</th><th className="p-3">Contacted</th><th className="p-3">Interested</th><th className="p-3">Registered</th><th className="p-3">Verified</th><th className="p-3">Active Pros / target</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.trade} className="border-t border-border-subtle">
                      <td className="p-3 font-semibold">{TRADE_LABELS[r.trade]?.name ?? r.trade}</td>
                      <td className="p-3">{r.leads}</td><td className="p-3">{r.contacted}</td><td className="p-3">{r.interested}</td><td className="p-3">{r.registered}</td><td className="p-3">{r.verified}</td>
                      <td className="p-3"><span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${TONE[r.tone]}`}>{r.activePros} / {r.target}</span></td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-text-muted">No trades enabled in this zone yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-4 text-sm font-bold text-text-muted">Phase 1 gate (last 30 days){gate.jobs30 === 0 ? " — no jobs yet" : ""}</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <Metric label="Jobs" value={String(gate.jobs30)} tone="none" hint={`${gate.activePros} active Pros`} />
              <Metric label="Bid within 15 min" value={gate.bid15Pct == null ? "—" : `${gate.bid15Pct}%`} tone={toneFor(gate.bid15Pct, TARGETS.bidWithin15MinPct)} hint={`target ${TARGETS.bidWithin15MinPct}%`} />
              <Metric label="Jobs / Pro / week" value={gate.jobsPerProWeek == null ? "—" : String(gate.jobsPerProWeek)} tone={toneFor(gate.jobsPerProWeek, TARGETS.jobsPerActiveProPerWeek)} hint={`target ${TARGETS.jobsPerActiveProPerWeek}`} />
              <Metric label="Completion rate" value={gate.completionPct == null ? "—" : `${gate.completionPct}%`} tone={toneFor(gate.completionPct, TARGETS.completionPct)} hint={`target ${TARGETS.completionPct}%`} />
              <Metric label="Average rating" value={gate.ratingAvg == null ? "—" : String(gate.ratingAvg)} tone={toneFor(gate.ratingAvg, TARGETS.ratingAvg)} hint={`target ${TARGETS.ratingAvg}`} />
            </div>
          </section>
        ))}
      </div>

      <h2 className="mb-2 mt-10 text-xl font-bold">Waitlist demand</h2>
      <p className="mb-3 text-sm text-text-muted">Early-list sign-ups and out-of-zone requests by country, city and area: where people are asking for Servigic. Use it to choose the next zone.</p>
      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted"><tr><th className="p-3">Country</th><th className="p-3">City</th><th className="p-3">Area</th><th className="p-3">Customers</th><th className="p-3">Pros</th></tr></thead>
          <tbody>
            {demand.slice(0, 80).map((d) => (
              <tr key={`${d.country}${d.city}${d.area}`} className="border-t border-border-subtle"><td className="p-3">{d.country}</td><td className="p-3">{d.city}</td><td className="p-3">{d.area}</td><td className="p-3">{d.customers}</td><td className="p-3">{d.pros}</td></tr>
            ))}
            {demand.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-text-muted">No sign-ups yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
