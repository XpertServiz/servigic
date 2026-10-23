"use client";

import { useEffect, useState } from "react";

// Hand-drawn chalk doodles of the trades (electrician: bulb, plug, screwdriver; AC technician: AC unit, fan, wrench) in the brand
// amber on a transparent background, "boiling" like a hand-drawn animation at a low opacity, tiled across the page behind the
// sign-in / sign-up card. The two scenes cross-fade every few seconds. Same frames as the apps (public/auth-doodles).
const SCENES = ["elec", "ac"] as const;
const FRAMES = 9;
const FRAME_MS = 170;
const SCENE_MS = 6000;
const src = (scene: string, f: number) => `/auth-doodles/${scene}_${f % FRAMES}.webp`;

export function AuthBackdrop() {
  const [frame, setFrame] = useState(0);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    // Load every frame once so the animation never flickers.
    for (const s of SCENES) for (let f = 0; f < FRAMES; f++) new Image().src = src(s, f);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // a still frame for reduced motion
    const a = setInterval(() => setFrame((n) => n + 1), FRAME_MS);
    const b = setInterval(() => setScene((n) => (n + 1) % SCENES.length), SCENE_MS);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {SCENES.map((s, idx) => (
        <div
          key={s}
          className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
          style={{ opacity: idx === scene ? 0.22 : 0, backgroundImage: `url(${src(s, frame)})`, backgroundRepeat: "repeat", backgroundSize: "auto 100%", backgroundPosition: "center" }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10,11,15,0.55) 0%, #0a0b0f 100%)" }} />
    </div>
  );
}
