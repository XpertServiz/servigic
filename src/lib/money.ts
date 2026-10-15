import { detectMarket } from "@/lib/geoDetect";
import { getExchangeRates } from "@/lib/currency";

/** The visitor's market currency (from their IP country, or their manual choice) and its rate per 1 PKR. */
export async function getMoney(): Promise<{ currency: string; rate: number }> {
  const [market, rates] = await Promise.all([detectMarket(), getExchangeRates()]);
  return { currency: market.currency, rate: rates[market.currency] ?? 1 };
}
