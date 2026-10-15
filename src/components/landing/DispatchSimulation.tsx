"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fmtPKR } from "@/lib/format";

const BIDS = [
  { key: "bidderPro", meta: "★4.9", eta: 40, price: 3500, avatar: "EP" },
  { name: "Haider K.", meta: "★4.7", eta: 55, price: 3900, avatar: "HK" },
  { key: "bidderFast", meta: "★4.8", eta: 30, price: 4100, avatar: "FF" },
] as const;

export function DispatchSimulation() {
  const t = useTranslations("sim");
  const locale = useLocale();
  const [visibleBids, setVisibleBids] = useState(0);
  const [won, setWon] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => {
        setVisibleBids(BIDS.length);
        setWon(true);
        setStatusStep(2);
        setReleased(true);
      }, 0);
      return () => clearTimeout(id);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    function runLoop() {
      setVisibleBids(0);
      setWon(false);
      setStatusStep(0);
      setReleased(false);
      BIDS.forEach((_, i) => {
        timers.push(setTimeout(() => setVisibleBids((v) => Math.max(v, i + 1)), i * 900));
      });
      timers.push(setTimeout(() => setWon(true), 3200));
      timers.push(setTimeout(() => setStatusStep(1), 5500));
      timers.push(setTimeout(() => setStatusStep(2), 8000));
      timers.push(setTimeout(() => setReleased(true), 9200));
    }

    runLoop();
    const interval = setInterval(runLoop, 12000);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  const statuses = [t("statusAccepted"), t("statusOnTheWay"), t("statusDone")];

  return (
    <div className="sv-card relative mx-auto min-h-[460px] w-full max-w-[560px] overflow-hidden p-5" aria-hidden>
      <div className="relative mb-4 h-[170px] overflow-hidden rounded-2xl bg-[#0d0f14] bg-[image:radial-gradient(circle_at_50%_50%,rgba(255,176,32,.14),transparent_65%),repeating-linear-gradient(0deg,#14161d_0_1px,transparent_1px_28px),repeating-linear-gradient(90deg,#14161d_0_1px,transparent_1px_28px)]">
        <span className="absolute start-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent rtl:translate-x-1/2">
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-accent" />
        </span>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl border border-white/10 bg-[rgba(18,20,26,.92)] px-3 py-2.5 text-xs">
          <div>
            <b className="text-[13px]">{t("job")}</b>
            <br />
            <span className="text-text-muted">{t("area")}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-danger">{t("emergency")}</span>
        </div>
      </div>

      <div className="flex min-h-[180px] flex-col gap-2.5">
        {BIDS.slice(0, visibleBids).map((b, i) => (
          <div
            key={b.avatar}
            className={`flex items-center justify-between gap-2.5 rounded-xl border bg-bg-elevated-2 px-3 py-2.5 transition-colors ${
              won && i === 0 ? "border-secondary shadow-[inset_0_0_0_1px_var(--secondary)]" : "border-border-subtle"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#232838] text-[11px] font-bold text-text-muted">{b.avatar}</div>
              <div>
                <div className="text-[13px] font-bold">{"key" in b ? t(b.key) : b.name}</div>
                <div className="text-[11px] text-text-muted">
                  {b.meta} · {t("eta", { min: b.eta })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-accent">{fmtPKR(b.price, locale)}</span>
              {won && i === 0 && <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground">{t("accepted")}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-bg-elevated-2 px-3.5 py-3">
        <div className="flex gap-1.5 text-[11px] font-bold text-text-muted">
          {statuses.map((s, i) => (
            <span key={s} className={i <= statusStep ? "text-secondary" : ""}>
              {s}
              {i < statuses.length - 1 ? <span className="rtl:hidden"> →</span> : null}
              {i < statuses.length - 1 ? <span className="hidden rtl:inline"> ←</span> : null}
            </span>
          ))}
        </div>
        <div className={`text-[13px] font-extrabold text-secondary transition-opacity ${released ? "opacity-100" : "opacity-0"}`}>{t("paid")}</div>
      </div>
    </div>
  );
}
