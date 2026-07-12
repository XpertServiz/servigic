"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/landing/Eyebrow";

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

interface Benchmark {
  sampleSize: number;
  avgWinningPKR: number;
  minPKR: number;
  maxPKR: number;
}

export function PriceTransparencyWidget({ categories, cities }: { categories: CategoryOption[]; cities: string[] }) {
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
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, city]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  if (categories.length === 0 || cities.length === 0) return null;

  return (
    <section className="mx-auto max-w-[900px] px-6 py-16">
      <Eyebrow>Real Prices, Real Time</Eyebrow>
      <h2 className="mb-6 font-display text-[clamp(28px,4.5vw,44px)] font-bold uppercase leading-tight">
        What jobs actually cost.
      </h2>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-2.5 text-sm outline-none focus:border-accent"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-2.5 text-sm outline-none focus:border-accent"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
        {benchmark === undefined ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : benchmark === null ? (
          <p className="text-sm text-text-muted">
            Not enough completed jobs yet for {selectedCategory?.name} in {city} to show a reliable price range —
            still, you set your own budget when you post.
          </p>
        ) : (
          <>
            <div className="font-display text-2xl font-bold text-accent">
              PKR {benchmark.minPKR.toLocaleString()}–{benchmark.maxPKR.toLocaleString()}
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Typical price for {selectedCategory?.name} in {city} · based on {benchmark.sampleSize} completed jobs ·
              avg PKR {benchmark.avgWinningPKR.toLocaleString()}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
