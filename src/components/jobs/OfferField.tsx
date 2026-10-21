"use client";

import { useEffect, useState } from "react";

interface Guide {
  currency: string;
  floor: number;
  low: number;
  suggested: number;
  high: number;
}

const fmt = (n: number) => n.toLocaleString();
// Step of the + / - buttons: about 5% of the suggested price, in a round number.
const stepFor = (g: Guide | null) => {
  const raw = (g?.suggested ?? 1000) * 0.05;
  return raw < 10 ? 5 : raw < 100 ? Math.round(raw / 5) * 5 : Math.round(raw / 50) * 50;
};

/**
 * "Your offer": the customer names the price he wants to pay (like inDrive); pros accept it or answer with their own. Shows what
 * is realistic for this service in his city and currency, warns when the offer is so low that pros will probably ignore it, and
 * suggests the range that gets a bid fastest.
 */
export function OfferField({ categoryId, city, value, onChange, currency }: { categoryId: string; city: string; value: string; onChange: (v: string) => void; currency: string }) {
  const [guide, setGuide] = useState<Guide | null>(null);

  useEffect(() => {
    if (!categoryId || !city) return;
    let cancelled = false;
    fetch(`/api/market/price-guide?categoryId=${categoryId}&city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setGuide(d.guide ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [categoryId, city]);

  const cur = guide?.currency ?? currency;
  const offer = Number(value) || 0;
  const step = stepFor(guide);
  const set = (n: number) => onChange(String(Math.max(0, Math.round(n))));

  let verdict: "none" | "too-low" | "low" | "good" | "high" = "none";
  if (guide && offer > 0) verdict = offer < guide.floor ? "too-low" : offer < guide.low ? "low" : offer > guide.high * 1.4 ? "high" : "good";

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text-muted">Your offer in {cur} (the price you want to pay)</label>
      <div className="flex items-stretch gap-2">
        <button type="button" onClick={() => set((offer || guide?.suggested || step * 2) - step)} aria-label="Lower the offer" className="w-12 rounded-[10px] border border-border-subtle text-xl hover:border-accent">
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={guide ? `e.g. ${fmt(guide.suggested)}` : ""}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-center text-lg font-bold outline-none focus:border-accent"
        />
        <button type="button" onClick={() => set((offer || guide?.suggested || step * 2) + step)} aria-label="Raise the offer" className="w-12 rounded-[10px] border border-border-subtle text-xl hover:border-accent">
          +
        </button>
      </div>

      {guide && (
        <p className="mt-2 text-xs text-text-muted">
          Pros usually ask <b className="text-accent">{cur} {fmt(guide.low)}–{fmt(guide.high)}</b> for this. Pros can accept your offer or answer with their own price.
        </p>
      )}
      {verdict === "too-low" && guide && (
        <div className="mt-2 rounded-[10px] border border-danger/40 bg-danger/10 p-3 text-sm">
          <b className="text-danger">This is below what pros accept (under {cur} {fmt(guide.floor)}).</b> Choose a price between <b>{cur} {fmt(guide.low)}</b> and <b>{cur} {fmt(guide.high)}</b> to get a pro&apos;s bid in minutes.{" "}
          <button type="button" onClick={() => set(guide.suggested)} className="font-semibold text-accent underline">
            Use {cur} {fmt(guide.suggested)}
          </button>
        </div>
      )}
      {verdict === "low" && guide && (
        <div className="mt-2 rounded-[10px] border border-accent/40 bg-accent/10 p-3 text-sm">
          A little low. Raise it to at least <b>{cur} {fmt(guide.low)}</b> so more pros answer.{" "}
          <button type="button" onClick={() => set(guide.low)} className="font-semibold text-accent underline">
            Use {cur} {fmt(guide.low)}
          </button>
        </div>
      )}
      {verdict === "good" && <p className="mt-2 text-sm text-secondary">Good offer: pros are likely to accept it quickly.</p>}
      {verdict === "high" && guide && <p className="mt-2 text-sm text-text-muted">That is higher than most jobs like this ({cur} {fmt(guide.low)}–{fmt(guide.high)}). You will get bids fast, but you may be paying more than needed.</p>}
      {verdict === "none" && guide && (
        <button type="button" onClick={() => set(guide.suggested)} className="mt-2 text-sm font-semibold text-accent underline">
          Use the suggested price: {cur} {fmt(guide.suggested)}
        </button>
      )}
    </div>
  );
}
