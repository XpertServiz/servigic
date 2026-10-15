"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LogoMark3D } from "@/components/brand/LogoMark3D";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

type Chip = { label: string; tone?: "accent" | "green" | "red" };

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (n: number) => void;
};

function canUseWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Hero 3D stage. Tiers: (1) pure-CSS 3D logo, always rendered, instant, no JS;
 * (2) the WebGL scene fades in over it when the device can afford it (WebGL
 * available, no reduced-motion, no data-saver, not a very low-end phone).
 * The scene pauses when scrolled out of view so it never burns battery.
 */
export function HeroVisual({ chips }: { chips: Chip[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"off" | "full" | "light">("off");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const saveData = nav.connection?.saveData === true;
    const lowEnd = (nav.hardwareConcurrency ?? 4) <= 2 || (nav.deviceMemory ?? 4) <= 2;
    if (reduced || saveData || lowEnd || !canUseWebGL()) return;
    const start = () => setMode(matchMedia("(max-width: 768px)").matches ? "light" : "full");
    // Wait for the page to settle so the 3D bundle never competes with first paint / LCP.
    const w = window as IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(start, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = setTimeout(start, 1200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const positions = ["start-[2%] top-[14%]", "end-[0%] top-[34%]", "start-[6%] bottom-[16%]"];
  return (
    <div ref={stage} className="relative mx-auto aspect-square w-full max-w-[560px]">
      <div className="sv-glow absolute inset-[8%] opacity-70" aria-hidden />
      {/* Tier 1: CSS 3D mark, fades out once WebGL is up */}
      <div className={`absolute inset-0 grid place-items-center transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`} aria-hidden>
        <LogoMark3D size={190} />
      </div>
      {/* Tier 2: WebGL scene */}
      {mode !== "off" && (
        <div className="sv-hero-canvas absolute inset-0" data-ready={ready} aria-hidden>
          <HeroScene active={visible} light={mode === "light"} onReady={() => setReady(true)} />
        </div>
      )}
      {chips.slice(0, 3).map((c, i) => (
        <div
          key={c.label}
          className={`sv-glass sv-float absolute ${positions[i]} flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold shadow-xl`}
          style={{ animationDelay: `${i * 1.4}s` }}
        >
          <span className={`h-2 w-2 rounded-full ${c.tone === "green" ? "bg-secondary" : c.tone === "red" ? "bg-danger" : "bg-accent"}`} />
          {c.label}
        </div>
      ))}
    </div>
  );
}
