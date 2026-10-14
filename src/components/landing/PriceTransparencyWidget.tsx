"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";
import { fmtPKR } from "@/lib/format";

interface CategoryOption {
  id: string;
  name: string;
  trade?: string;
  icon: string;
}

interface Benchmark {
  sampleSize: number;
  avgWinningPKR: number;
  minPKR: number;
  maxPKR: number;
  isEstimate: boolean;
}

const selectCls =
  "rounded-full border border-white/10 bg-bg-elevated px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export function PriceTransparencyWidget({ categories, cities }: { categories: CategoryOption[]; cities: string[] }) {
  const t = useTranslations("price");
  const ts = useTranslations("services.trades");
  const tc = useTranslations("cities");
  const locale = useLocale();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState(cities[0] ?? "");
  const [benchmark, setBenchmark] = useState<Benchmark | null | undefined>(undefined);

  useEffect(() => {
    if (!categoryId || !city) return;
    let cancelled = false;
    fetch(`/api/market/price-benchmark?categoryId=${categoryId}&city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBenchmark(data.benchmark);
      })
      .catch(() => {
        if (!cancelled) setBenchmark(null);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, city]);

  if (categories.length === 0 || cities.length === 0) return null;

  const label = (c: CategoryOption) => (c.trade && ts.has(c.trade) ? ts(c.trade) : c.name);
  const cityLabel = (c: string) => (tc.has(c) ? tc(c) : c);
  const selected = categories.find((c) => c.id === categoryId);
  const service = selected ? label(selected) : "";
  const cityName = cityLabel(city);

  return (
    <section className="container-x max-w-[900px] py-16 md:py-20">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} />
      <Reveal>
        <div className="mb-5 flex flex-wrap gap-3">
          <select aria-label={t("city")} value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
            {cities.map((c) => (
              <option key={c} value={c}>
                {cityLabel(c)}
              </option>
            ))}
          </select>
          <select aria-label={t("service")} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {label(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="sv-card p-6 md:p-8">
          {benchmark === undefined ? (
            <p className="text-sm text-text-muted">{t("loading")}</p>
          ) : benchmark === null ? (
            <p className="text-sm text-text-muted">{t("notEnough", { service, city: cityName })}</p>
          ) : (
            <>
              <div className="text-3xl font-extrabold tracking-[-0.018em] text-accent" dir="ltr">
                {fmtPKR(benchmark.minPKR, locale)}–{fmtPKR(benchmark.maxPKR, locale).replace("PKR ", "")}
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {benchmark.isEstimate
                  ? t("estimate", { service, city: cityName })
                  : t("typical", { service, city: cityName, count: benchmark.sampleSize, avg: fmtPKR(benchmark.avgWinningPKR, locale) })}
              </p>
            </>
          )}
        </div>
      </Reveal>
    </section>
  );
}
