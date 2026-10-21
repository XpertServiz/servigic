import { SKY, skylineFor } from "./skylines";

/**
 * The hero background: the visitor's country skyline at golden hour (Kingdom Centre in Saudi Arabia, Minar-e-Pakistan and
 * Badshahi Mosque in Pakistan, CN Tower in Canada ...). Pure SVG, no image download, and it fades out under the text.
 */
export function CountryBackdrop({ country }: { country: string | null | undefined }) {
  const code = (country ?? "XX").toUpperCase();
  const [top, mid, glow] = SKY[code] ?? SKY.XX;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 62%, ${glow}33 100%)`, opacity: 0.55 }} />
      <div className="absolute bottom-0 end-[-4%] h-[62%] w-[88%] sm:w-[70%] lg:h-[78%] lg:w-[58%]" style={{ WebkitMaskImage: "linear-gradient(to left, #000 55%, transparent 100%)", maskImage: "linear-gradient(to left, #000 55%, transparent 100%)" }}>
        <svg viewBox="0 0 800 300" preserveAspectRatio="xMaxYMax meet" className="h-full w-full text-[#0a0b0f]" fill="currentColor">
          <defs>
            <radialGradient id={`sun-${code}`} cx="72%" cy="62%" r="42%">
              <stop offset="0%" stopColor={glow} stopOpacity="0.85" />
              <stop offset="100%" stopColor={glow} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="300" fill={`url(#sun-${code})`} />
          <style>{`.w{fill:${glow};opacity:.75}`}</style>
          <g dangerouslySetInnerHTML={{ __html: skylineFor(code) }} />
          <rect y="298" width="800" height="2" fill={glow} opacity=".5" />
        </svg>
      </div>
    </div>
  );
}
