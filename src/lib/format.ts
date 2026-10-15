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

/**
 * Display-only price in the visitor's market currency. PKR is the real
 * transactional price; anything else is an approximation (hence the "~").
 */
export function fmtMoney(pkr: number, locale: string, currency = "PKR", rate = 1): string {
  if (currency === "PKR") return fmtPKR(pkr, locale);
  return `~${new Intl.NumberFormat(tag(locale), { style: "currency", currency, maximumFractionDigits: 0 }).format(pkr * rate)}`;
}

/** An exact amount in a given currency (Latin digits). */
export function fmtCurrency(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(tag(locale), { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

/** Rounds an example amount to a tidy figure (35 / 170 / 1,250) so scaled demos don't look machine-made. */
export function demoAmount(pkr: number, factor: number): number {
  const v = pkr * factor;
  if (factor === 1) return pkr;
  const step = v < 100 ? 5 : v < 1000 ? 10 : 50;
  return Math.max(step, Math.round(v / step) * step);
}

/**
 * Example price used in demos/illustrations, scaled to the visitor's market
 * (a 3,500 PKR AC repair becomes ~175 SAR in Saudi Arabia, not a conversion).
 */
export function fmtDemo(pkr: number, locale: string, currency = "PKR", factor = 1): string {
  return currency === "PKR" ? fmtPKR(pkr, locale) : fmtCurrency(demoAmount(pkr, factor), locale, currency);
}
