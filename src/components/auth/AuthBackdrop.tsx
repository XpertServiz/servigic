"use client";

import { useEffect, useState } from "react";

// The pictures behind the sign-in / sign-up card: the Servigic designs (the same as the Customer and Pro apps), cross-fading every two
// seconds, starting at a random one. Pictures: public/auth-designs (1080 px).
const IMAGES = [...Array.from({ length: 9 }, (_, i) => `/auth-designs/p${i + 1}.webp`), ...Array.from({ length: 10 }, (_, i) => `/auth-designs/c${i + 1}.webp`)];
const EVERY_MS = 2000;

export function AuthBackdrop() {
  // Two layers: the visible one and the one being prepared; the next picture is loaded before it fades in.
  const [layers, setLayers] = useState<{ srcs: [string | null, string | null]; top: 0 | 1; index: number }>({ srcs: [null, null], top: 0, index: -1 });
  useEffect(() => {
    let index = Math.floor(Math.random() * IMAGES.length);
    let top: 0 | 1 = 0;
    const show = (i: number, t: 0 | 1, first = false) => {
      const img = new Image();
      img.onload = () =>
        setLayers((l) => {
          const srcs: [string | null, string | null] = [...l.srcs] as [string | null, string | null];
          srcs[t] = IMAGES[i];
          return { srcs, top: t, index: first ? i : i };
        });
      img.src = IMAGES[i];
    };
    show(index, 0, true);
    const timer = setInterval(() => {
      index = (index + 1) % IMAGES.length;
      top = top === 0 ? 1 : 0;
      show(index, top);
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {([0, 1] as const).map((t) =>
        layers.srcs[t] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={t} src={layers.srcs[t] as string} alt="" className="absolute inset-x-0 top-0 h-[62vh] w-full object-cover transition-opacity duration-700" style={{ opacity: layers.top === t ? 0.8 : 0 }} />
        ) : null,
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,11,15,0.2) 0%, rgba(10,11,15,0.55) 38%, #0a0b0f 72%)" }} />
    </div>
  );
}
