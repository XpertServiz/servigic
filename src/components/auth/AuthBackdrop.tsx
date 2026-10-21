"use client";

import { useEffect, useState } from "react";
import { AUTH_SCENES } from "./authScenes";

/**
 * Soft slideshow behind the sign-in / sign-up card: line-art of the trades (plumber, electrician, carpenter, AC technician,
 * painter) cross-fading every few seconds at a very low opacity, so the page stays calm and the form stays readable.
 * Respects reduced-motion (shows one still scene).
 */
export function AuthBackdrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % AUTH_SCENES.length), 5500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {AUTH_SCENES.map((s, idx) => (
        <div
          key={s.key}
          className="absolute inset-0 flex items-center justify-center text-accent transition-opacity duration-[2200ms] ease-in-out"
          style={{ opacity: idx === i ? 0.16 : 0 }}
          dangerouslySetInnerHTML={{ __html: s.svg.replace("<svg ", '<svg class="h-[130%] w-[130%] max-w-none sm:h-[95%] sm:w-[95%]" ') }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, #0a0b0f 100%)" }} />
    </div>
  );
}
