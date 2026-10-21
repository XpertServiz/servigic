"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface CountryView {
  code: string;
  name: string;
  state: "off" | "waitlist" | "pilot" | "live";
  cities: string[];
  markets: number;
}

const STATES: { key: CountryView["state"]; label: string; tone: string }[] = [
  { key: "off", label: "Off", tone: "border-danger/60 bg-danger/10 text-danger" },
  { key: "waitlist", label: "Waitlist", tone: "border-accent/60 bg-accent/10 text-accent" },
  { key: "pilot", label: "Pilot", tone: "border-secondary/60 bg-secondary/10 text-secondary" },
  { key: "live", label: "Live", tone: "border-secondary bg-secondary text-secondary-foreground" },
];

// One switch per country: Off / Waitlist / Pilot / Live. It changes the country's language and display settings AND its
// markets together, so "Countries & Localization" and "Markets & Launch" can no longer disagree.
export function CountrySwitches({ countries }: { countries: CountryView[] }) {
  return (
    <section className="mb-8 rounded-[16px] border border-border-subtle bg-bg-elevated/40 p-5">
      <h2 className="mb-1 text-lg font-bold">Countries: quick on / off</h2>
      <p className="mb-4 max-w-3xl text-sm text-text-muted">
        <b>Off</b>: nobody can sign up or post. <b>Waitlist</b>: people sign up and join the list, no jobs yet. <b>Pilot / Live</b>: accounts and jobs work inside the zones below. A country with no market yet gets one
        automatically (all its cities, every service on): draw a small zone on its card below to restrict it to a few areas.
      </p>
      <div className="flex flex-col gap-3">
        {countries.map((c) => (
          <Row key={c.code} c={c} />
        ))}
      </div>
    </section>
  );
}

function Row({ c }: { c: CountryView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cities, setCities] = useState(c.cities.join(", "));

  async function apply(state: CountryView["state"], withCities = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/markets/country", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: c.code, state, ...(withCities ? { cities: cities.split(",").map((s) => s.trim()).filter(Boolean) } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`${c.name}: ${state}${data.activated ? `, ${data.activated} waiting pros activated` : ""}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-border-subtle bg-bg-elevated p-3">
      <div className="min-w-[10rem] font-semibold">
        {c.name} <span className="text-xs font-normal text-text-muted">({c.code})</span>
      </div>
      <div className="flex gap-1.5" role="group" aria-label={`${c.name} state`}>
        {STATES.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={busy}
            onClick={() => apply(s.key)}
            aria-pressed={c.state === s.key}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-opacity disabled:opacity-60 ${c.state === s.key ? s.tone : "border-border-subtle text-text-muted opacity-70 hover:opacity-100"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Cities, comma-separated" className="min-w-[14rem] flex-1 rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-3 py-1.5 text-sm" aria-label={`${c.name} cities`} />
      <button type="button" disabled={busy || c.state === "off"} onClick={() => apply(c.state, true)} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs hover:border-accent disabled:opacity-40">
        Save cities
      </button>
      <span className="text-xs text-text-muted">{c.markets} market{c.markets === 1 ? "" : "s"}</span>
    </div>
  );
}
