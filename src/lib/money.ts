import { detectMarket } from "@/lib/geoDetect";
import { getExchangeRates } from "@/lib/currency";
import { demoFactor } from "@/lib/marketPrices";
import { fmtCurrency, fmtDemo } from "@/lib/format";

/** The visitor's market currency (from their IP country, or their manual choice) and its rate per 1 PKR. */
export async function getMoney(): Promise<{ country: string; currency: string; rate: number }> {
  const [market, rates] = await Promise.all([detectMarket(), getExchangeRates()]);
  return { country: market.country, currency: market.currency, rate: rates[market.currency] ?? 1 };
}

/** Server-side helper for example amounts in copy (hero chip, demo bids, calculators). */
export async function getDemoMoney(locale: string) {
  const m = await getMoney();
  const factor = m.currency === "PKR" ? 1 : demoFactor(m.country, m.rate);
  return {
    currency: m.currency,
    factor,
    price: (pkr: number) => fmtDemo(pkr, locale, m.currency, factor),
    zero: m.currency === "PKR" ? "PKR 0" : fmtCurrency(0, locale, m.currency),
  };
}
