"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { demoAmount, fmtCurrency, fmtNumber, fmtPKR } from "@/lib/format";
import { useDemoMoney } from "@/components/i18n/DemoMoney";

export function EarningsCalculator() {
  const t = useTranslations("calc");
  const locale = useLocale();
  const { currency, factor } = useDemoMoney();
  // Amounts are in the visitor's own currency (scaled from the Pakistani example), not converted PKR.
  const fmt = (n: number) => (currency === "PKR" ? fmtPKR(n, locale) : fmtCurrency(n, locale, currency));
  const min = demoAmount(500, factor);
  const max = demoAmount(10000, factor);
  const step = Math.max(1, Math.round((max - min) / 95));
  const [jobsPerWeek, setJobsPerWeek] = useState(8);
  const [avgTicket, setAvgTicket] = useState(demoAmount(2500, factor));
  const monthly = jobsPerWeek * 4.33 * avgTicket * 0.88;

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border-subtle bg-bg-elevated-2 p-4">
        <div className="flex flex-wrap justify-between gap-2 text-[13px] text-text-muted">
          <span>
            {t("jobsPerWeek")}: <b className="text-text">{fmtNumber(jobsPerWeek, locale)}</b>
          </span>
          <span>
            {t("avgTicket")}: <b className="text-text">{fmt(avgTicket)}</b>
          </span>
        </div>
        <input type="range" aria-label={t("jobsPerWeek")} min={1} max={30} value={jobsPerWeek} onChange={(e) => setJobsPerWeek(Number(e.target.value))} className="mt-3 w-full accent-accent" />
        <input type="range" aria-label={t("avgTicket")} min={min} max={max} step={step} value={avgTicket} onChange={(e) => setAvgTicket(Number(e.target.value))} className="mt-3 w-full accent-accent" />
      </div>
      <div className="mb-4 flex flex-col items-center gap-1 rounded-2xl border border-secondary/25 bg-secondary/[0.07] p-5">
        <span className="text-[13px] text-text-muted">{t("monthly")}</span>
        <div className="text-3xl font-extrabold tracking-[-0.018em] text-secondary" dir="ltr">
          {fmt(Math.round(monthly))}
        </div>
        <span className="text-[11px] text-text-muted">{t("note")}</span>
      </div>
    </>
  );
}
