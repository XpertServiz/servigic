import { getLocale, getTranslations } from "next-intl/server";
import { HERO_COUNTRIES } from "./heroCountries";

/** Country name in the visitor's language ("Saudi Arabia", "Pakistan", "المملكة العربية السعودية" ...). */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * The hero background, chosen by the visitor's IP country: a real night photo of the country's main / capital city on the top
 * right, fading into the page, with the handwritten "Trusted Local Pros in {country}" on it (Riyadh for Saudi Arabia,
 * Islamabad for Pakistan, Toronto for Canada ...). A country without a photo keeps the plain dark atmosphere.
 */
export async function CountryBackdrop({ country }: { country: string | null | undefined }) {
  const code = (country ?? "").toUpperCase();
  const entry = HERO_COUNTRIES[code];
  const [t, locale] = await Promise.all([getTranslations("hero"), getLocale()]);
  const name = code ? countryName(code, locale) : "";

  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {entry && (
          <div
            className="absolute end-0 top-0 h-[400px] w-full opacity-60 sm:h-[460px] lg:h-[500px] lg:w-[76%] lg:opacity-100"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, #000 40%, transparent 100%), linear-gradient(to left, #000 70%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, #000 40%, transparent 100%), linear-gradient(to left, #000 70%, transparent 100%)",
              WebkitMaskComposite: "source-in",
              maskComposite: "intersect",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.photo} alt="" className="h-full w-full object-cover" style={{ objectPosition: entry.position }} fetchPriority="high" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/45 via-transparent to-bg/30" />
          </div>
        )}
      </div>

      {code && (
        <div className="pointer-events-none absolute end-4 top-6 z-0 max-w-[200px] -rotate-6 text-end md:end-10 md:top-10 md:max-w-[280px] rtl:rotate-6">
          <p className="font-hand text-[26px] font-bold leading-[1.05] text-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] md:text-[38px]">{t("trustedIn", { country: name })}</p>
          <svg viewBox="0 0 220 14" className="ms-auto mt-1 h-3 w-[78%] text-accent" fill="none" aria-hidden>
            <path d="M4 10 C50 2 120 2 216 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {entry && (
        <a
          href={entry.credit.page}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 start-4 z-0 hidden max-w-[340px] truncate text-[10px] text-text-muted/60 hover:text-text-muted lg:block"
          title={`${entry.credit.place}: ${entry.credit.author}, ${entry.credit.license} (Wikimedia Commons)`}
        >
          {entry.credit.place} · {entry.credit.author} · {entry.credit.license}
        </a>
      )}
    </>
  );
}
