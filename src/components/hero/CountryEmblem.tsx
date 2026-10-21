/** The Saudi national emblem, simplified: a palm over two crossed swords. */
function SaudiEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M30 93 Q52 79 90 57" strokeWidth="4.5" />
      <path d="M70 93 Q48 79 10 57" strokeWidth="4.5" />
      <path d="M24 88 L36 97 M76 88 L64 97" strokeWidth="4" />
      <path d="M50 78 L50 42" strokeWidth="5" />
      <path d="M50 42 Q50 28 50 18" strokeWidth="3.5" />
      <path d="M50 42 Q38 30 25 34 M50 42 Q40 24 31 22 M50 42 Q32 40 20 50" strokeWidth="3.5" />
      <path d="M50 42 Q62 30 75 34 M50 42 Q60 24 69 22 M50 42 Q68 40 80 50" strokeWidth="3.5" />
    </svg>
  );
}

/** The country's mark on the glowing orb: the palm and swords for Saudi Arabia, the flag in a gold ring for every other country. */
export function OrbEmblem({ country }: { country: string }) {
  const cc = country.toUpperCase();
  if (cc === "SA") return <SaudiEmblem className="h-[34%] w-[34%] text-[#fff3cf] drop-shadow-[0_0_14px_rgba(255,214,120,0.9)]" />;
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w160/${cc.toLowerCase()}.png`}
      alt=""
      className="h-[26%] w-[26%] rounded-full border-2 border-[#ffd98a] object-cover shadow-[0_0_24px_rgba(255,200,90,0.7)]"
      loading="lazy"
    />
  );
}

/** A faint outline of the country with its mark inside, left of the orb. */
export function CountryWatermark({ country, shape }: { country: string; shape?: { w: number; h: number; d: string } | null }) {
  const cc = country.toUpperCase();
  if (!shape) return null;
  const { w, h, d } = shape;
  return (
    <svg viewBox={`-6 -6 ${w + 12} ${h + 12}`} className="pointer-events-none absolute start-[-6%] top-[24%] w-[38%] text-white" aria-hidden>
      <path d={d} fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8" />
      {cc === "SA" && (
        <g transform={`translate(${w / 2 - 22} ${h / 2 - 22}) scale(0.44)`} stroke="currentColor" strokeOpacity="0.28" fill="none">
          <path d="M30 93 Q52 79 90 57 M70 93 Q48 79 10 57 M50 78 L50 18 M50 42 Q38 30 25 34 M50 42 Q62 30 75 34" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
