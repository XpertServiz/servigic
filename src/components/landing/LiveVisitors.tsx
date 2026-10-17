"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { VisitorStats } from "@/lib/visitors";
import { flagEmoji, fmtNumber, regionName } from "@/lib/format";

const POLL_MS = 15_000;

/** Counts up/down smoothly toward the latest value. */
function useAnimatedNumber(target: number): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = duration === 0 ? 1 : Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + (target - start) * eased);
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function Metric({ label, value, accent, live }: { label: string; value: number; accent?: boolean; live?: boolean }) {
  const locale = useLocale();
  const shown = useAnimatedNumber(value);
  return (
    <div className="sv-card p-5 text-center md:p-6">
      <div className={`text-[clamp(30px,4.4vw,46px)] font-extrabold leading-none tracking-[-0.018em] ${accent ? "text-secondary" : "text-accent"}`}>{fmtNumber(shown, locale)}</div>
      <div className="mt-2 flex items-center justify-center gap-2 text-[13px] text-text-muted">
        {live && <span className="sv-live-dot" aria-hidden />}
        {label}
      </div>
    </div>
  );
}

export function LiveVisitors({ initial, embedded = false }: { initial: VisitorStats; embedded?: boolean }) {
  const t = useTranslations("live");
  const locale = useLocale();
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let stop = false;
    async function load() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/visitors/stats", { cache: "no-store" });
        if (res.ok && !stop) setStats(await res.json());
      } catch {
        // keep the last numbers
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const max = Math.max(1, ...stats.countries.map((c) => c.visitors));
  const known = stats.countries.filter((c) => c.country !== "XX");
  const unknown = stats.countries.find((c) => c.country === "XX");

  return (
    <section className={embedded ? "mt-10" : "container-x py-16 md:py-24"} aria-labelledby="live-title">
      <div className="sv-card relative overflow-hidden p-6 md:p-10">
        <div className="sv-glow pointer-events-none absolute -top-32 end-[-10%] h-[420px] w-[420px] opacity-50" aria-hidden />
        <div className="relative mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[640px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3.5 py-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-secondary">
              <span className="sv-live-dot" aria-hidden /> {t("eyebrow")}
            </div>
            <h2 id="live-title" className="text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-[-0.018em]">
              {t("title")}
            </h2>
            <p className="mt-3 text-text-muted">{t("sub")}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Metric label={t("online")} value={stats.online} accent live />
          <Metric label={t("today")} value={stats.today} />
          <Metric label={t("total")} value={stats.total} />
          <Metric label={t("views")} value={stats.pageViews} />
        </div>

        <div className="relative mt-8">
          <h3 className="mb-4 font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">{t("countries")}</h3>
          {stats.countries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted">{t("empty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...known, ...(unknown ? [unknown] : [])].slice(0, 12).map((c) => (
                <li key={c.country} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="text-base leading-none">
                        {flagEmoji(c.country)}
                      </span>
                      <span className="truncate font-medium">{regionName(c.country, locale) ?? t("unknown")}</span>
                      {c.online > 0 && (
                        <span className="flex flex-none items-center gap-1 text-[11px] font-semibold text-secondary">
                          <span className="sv-live-dot" aria-hidden />
                          {fmtNumber(c.online, locale)} {t("onlineHere")}
                        </span>
                      )}
                    </span>
                    <span className="flex-none font-mono text-[13px] text-text-muted">{fmtNumber(c.visitors, locale)}</span>
                  </div>
                  <div className="sv-bar" aria-hidden>
                    <span style={{ width: `${Math.max(4, (c.visitors / max) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="relative mt-6 text-xs text-text-muted/80">{t("privacy")}</p>
      </div>
    </section>
  );
}
