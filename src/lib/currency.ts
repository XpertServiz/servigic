import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Currency } from "@prisma/client";

// Fallback rates (units of currency per 1 PKR) — used only if the admin
// hasn't set real rates yet in /admin/exchange-rates. Rough July-2026
// ballpark figures, not live market rates.
export const FALLBACK_RATES: Record<Currency, number> = {
  PKR: 1,
  USD: 0.0036,
  CAD: 0.0049,
  EUR: 0.0033,
  PLN: 0.0142,
  SAR: 0.0135,
  AED: 0.0132,
  QAR: 0.0131,
};

const LOCALE_FOR_CURRENCY: Record<Currency, string> = {
  PKR: "en-PK",
  USD: "en-US",
  CAD: "en-CA",
  EUR: "de-DE",
  PLN: "pl-PL",
  SAR: "ar-SA",
  AED: "ar-AE",
  QAR: "ar-QA",
};

// Rates only change when an admin edits them at /admin/exchange-rates, so
// there's no need to hit the DB on every price render — cached 5 minutes
// (Geo-Localized Landing Page Addendum v5 §5/§8: "zero API calls happen on
// the user-facing request path").
const getCachedExchangeRates = unstable_cache(
  async () => {
    const rows = await prisma.exchangeRate.findMany();
    const rates = { ...FALLBACK_RATES };
    for (const row of rows) rates[row.currency] = row.ratePerPKR;
    return rates;
  },
  ["exchange-rates"],
  { revalidate: 300, tags: ["exchange-rates"] }
);

export async function getExchangeRates(): Promise<Record<Currency, number>> {
  try {
    return await getCachedExchangeRates();
  } catch {
    return FALLBACK_RATES;
  }
}

export function convertFromPKR(amountPKR: number, currency: Currency, rates: Record<Currency, number>): number {
  return amountPKR * (rates[currency] ?? FALLBACK_RATES[currency]);
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE_FOR_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(amount);
}

/**
 * PKR is the real, transactional price everywhere in the app. This
 * produces an approximate display string for browsing — always call
 * this for *display only*, never for anything charged or stored.
 */
export async function formatApproxFromPKR(amountPKR: number, currency: Currency): Promise<string> {
  if (currency === "PKR") return formatCurrency(amountPKR, "PKR");
  const rates = await getExchangeRates();
  const converted = convertFromPKR(amountPKR, currency, rates);
  return `~${formatCurrency(converted, currency)}`;
}
