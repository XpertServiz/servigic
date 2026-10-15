"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionHead } from "@/components/ui/SectionHead";

const TAB_KEYS = ["fixed", "lead", "call"] as const;

export function WhySection() {
  const t = useTranslations("why");
  const features = t.raw("features") as string[];
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("fixed");

  return (
    <section className="container-x py-16 md:py-24">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} />

      <div role="tablist" className="mb-3 flex flex-wrap gap-2">
        {TAB_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === k ? "border-accent bg-accent/10 text-accent" : "border-border-subtle text-text-muted hover:border-accent/40"
            }`}
          >
            {t(`tabs.${k}.label`)}
          </button>
        ))}
      </div>
      <p className="mb-6 text-xs text-text-muted">
        {t("vs")} {t(`tabs.${tab}.sub`)}
      </p>

      <div className="sv-card overflow-x-auto p-2 md:p-4">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border-subtle p-4 text-start" />
              <th className="border-b border-border-subtle p-4 text-center font-mono text-xs font-semibold uppercase tracking-wide text-text-muted">{t(`tabs.${tab}.label`)}</th>
              <th className="border-b border-border-subtle p-4 text-center font-mono text-xs font-semibold uppercase tracking-wide text-accent">Servigic</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature}>
                <td className="border-b border-border-subtle p-4 font-semibold text-text-muted">{feature}</td>
                <td className="border-b border-border-subtle p-4 text-center font-bold text-danger">✕</td>
                <td className="border-b border-border-subtle p-4 text-center font-bold text-secondary">✓</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
