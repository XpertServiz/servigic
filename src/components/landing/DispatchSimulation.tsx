"use client";

import { useEffect, useRef, useState } from "react";

const BIDS = [
  { name: "Electrician Pro #17", meta: "★4.9 · 40 min ETA", price: "PKR 3,500", avatar: "EP" },
  { name: "Haider K.", meta: "★4.7 · 55 min ETA", price: "PKR 3,900", avatar: "HK" },
  { name: "Fast Fix Services", meta: "★4.8 · 30 min ETA", price: "PKR 4,100", avatar: "FF" },
];

export function DispatchSimulation() {
  const [visibleBids, setVisibleBids] = useState(0);
  const [won, setWon] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [released, setReleased] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion.current) {
      setVisibleBids(BIDS.length);
      setWon(true);
      setStatusStep(2);
      setReleased(true);
      return;
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

  const statuses = ["Accepted", "On the way", "Done"];

  return (
    <div className="relative min-h-[460px] overflow-hidden rounded-[20px] border border-border-subtle bg-bg-elevated p-5">
      <div className="relative mb-4 h-[170px] overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,176,32,.12),transparent_65%)] bg-[#0d0f14] bg-[length:28px_28px] bg-[image:repeating-linear-gradient(0deg,#14161d_0_1px,transparent_1px_28px),repeating-linear-gradient(90deg,#14161d_0_1px,transparent_1px_28px)]">
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent">
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-accent" />
        </span>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-[10px] border border-border-subtle bg-[rgba(18,20,26,.92)] px-3 py-2.5 text-xs">
          <div>
            <b className="text-[13px]">AC not cooling</b>
            <br />
            <span className="text-text-dim text-text-muted">Gulshan-e-Iqbal</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-danger">Emergency</span>
        </div>
      </div>

      <div className="flex min-h-[180px] flex-col gap-2.5">
        {BIDS.slice(0, visibleBids).map((b, i) => (
          <div
            key={b.name}
            className={`flex items-center justify-between gap-2.5 rounded-[10px] border px-3 py-2.5 transition-colors ${
              won && i === 0 ? "border-secondary shadow-[inset_0_0_0_1px_var(--secondary)]" : "border-border-subtle"
            } bg-bg-elevated-2`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#232838] text-[11px] font-bold text-text-muted">
                {b.avatar}
              </div>
              <div>
                <div className="text-[13px] font-bold">{b.name}</div>
                <div className="text-[11px] text-text-muted">{b.meta}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-accent">{b.price}</span>
              {won && i === 0 && (
                <span className="rounded-[5px] bg-secondary px-2 py-0.5 text-[10px] font-extrabold uppercase text-secondary-foreground">
                  Accepted ✓
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-3.5 py-3">
        <div className="flex gap-1.5 text-[11px] font-bold text-text-muted">
          {statuses.map((s, i) => (
            <span key={s} className={i <= statusStep ? "text-secondary" : ""}>
              {s}
              {i < statuses.length - 1 ? " →" : ""}
            </span>
          ))}
        </div>
        <div className={`text-[13px] font-extrabold text-secondary transition-opacity ${released ? "opacity-100" : "opacity-0"}`}>
          PKR 3,500 released ✓
        </div>
      </div>
    </div>
  );
}
