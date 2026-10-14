// Latin digits in every language (Arabic/Urdu/Hindi locales would otherwise render
// native-script digits, which clashes with the PKR prices shown across the site).
function tag(locale: string): string {
  return `${locale}-u-nu-latn`;
}

export function fmtNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(tag(locale)).format(n);
}

export function fmtPKR(n: number, locale: string): string {
  return `PKR ${fmtNumber(Math.round(n), locale)}`;
}

export function fmtCompactPKR(n: number, locale: string): string {
  if (n >= 1_000_000) return `PKR ${fmtNumber(Math.round(n / 100_000) / 10, locale)}M`;
  if (n >= 1_000) return `PKR ${fmtNumber(Math.round(n / 100) / 10, locale)}K`;
  return fmtPKR(n, locale);
}

/** "PK" → "Pakistan" / "باكستان" / "Pakistan" (German) using the viewer's language. */
export function regionName(code: string, locale: string): string | null {
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? null;
  } catch {
    return null;
  }
}

/** ISO country code → flag emoji (regional-indicator pair). */
export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
