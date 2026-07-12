"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/landing/Eyebrow";

const FEATURES = [
  "Real price competition (bidding)",
  "Full-amount escrow protection",
  "Live Uber-style tracking",
  "Zero lead fees for pros",
  "Public verified badge ladder",
];

const TABS = [
  { key: "fixed-price", label: "Fixed-Price Apps", sublabel: "Mahir, Karsaaz, HukumJanab-style" },
  { key: "lead-selling", label: "Lead-Selling Platforms", sublabel: "Thumbtack, Angi, Checkatrade, MyBuilder-style" },
  { key: "call-centers", label: "Call Centers", sublabel: "HukumJanab-style phone/app dispatch" },
] as const;

export function WhySection() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("fixed-price");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="mb-10 max-w-[640px]">
        <Eyebrow>Why Servigic</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">
          BRUTALLY HONEST COMPARISON.
        </h2>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-accent bg-accent/10 text-accent" : "border-border-subtle text-text-muted hover:border-accent/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-6 text-xs text-text-muted">vs. {active.sublabel}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border-subtle p-4 text-start" />
              <th className="border-b border-border-subtle p-4 text-start text-xs font-semibold uppercase tracking-wide text-text-muted">
                {active.label}
              </th>
              <th className="border-b border-border-subtle p-4 text-start text-xs font-semibold uppercase tracking-wide text-accent">
                Servigic
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature}>
                <td className="border-b border-border-subtle p-4 font-semibold text-text-muted">{feature}</td>
                <td className="border-b border-border-subtle p-4 font-bold text-danger">✕</td>
                <td className="border-b border-border-subtle p-4 font-bold text-secondary">✓</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
