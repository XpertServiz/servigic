"use client";

import { useEffect, useState } from "react";

// The picture behind the sign-in / sign-up card: one of the Servigic designs (the same as the Customer and Pro apps), a different one on
// every visit, fading into the page background. Pictures: public/auth-designs.
const IMAGES = [...Array.from({ length: 9 }, (_, i) => `/auth-designs/p${i + 1}.webp`), ...Array.from({ length: 10 }, (_, i) => `/auth-designs/c${i + 1}.webp`)];

export function AuthBackdrop() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSrc(IMAGES[Math.floor(Math.random() * IMAGES.length)]), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-x-0 top-0 h-[62vh] w-full object-cover opacity-70" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,11,15,0.25) 0%, rgba(10,11,15,0.6) 35%, #0a0b0f 70%)" }} />
    </div>
  );
}
