import { prisma } from "@/lib/prisma";
import { getExchangeRates } from "@/lib/currency";
import { MARKET_PRICES, demoFactor } from "@/lib/marketPrices";
import { getMarkets, marketForCity } from "@/lib/marketConfig";
import { niceRound } from "@/lib/walletLimits";

// The price guide behind the customer's "Your offer" field (like inDrive: the customer names the price, pros accept or answer with
// their own). It tells the customer, in his own currency, what is realistic for this service in his city, and where an offer
// is so low that pros will probably ignore it:
//   floor      below this, pros rarely bid: show "too low" and suggest the range
//   low..high  the range that gets bids fast
//   suggested  a good starting offer (the "Use this price" button)
// Sources, best first: real completed jobs of the last 30 days in that city (when there are enough), else the researched local
// "starting from" prices for the country (Saudi Arabia, UAE ...), else the Pakistani minimum scaled to the local price level.

export interface PriceGuide {
  currency: string;
  country: string | null;
  floor: number;
  low: number;
  suggested: number;
  high: number;
  source: "real-jobs" | "local-research" | "scaled";
}

export async function priceGuideFor(categoryId: string, city: string): Promise<PriceGuide | null> {
  const [category, markets, rates] = await Promise.all([prisma.serviceCategory.findUnique({ where: { id: categoryId } }), getMarkets(), getExchangeRates()]);
  if (!category) return null;
  const market = marketForCity(markets, city);
  const currency = market?.currency ?? "PKR";
  const country = market?.countryCode ?? null;

  const real = await prisma.priceBenchmark.findFirst({ where: { categoryId, city, subServiceId: null, windowDays: 30 } });
  if (real && real.sampleSize >= 5) {
    const mid = real.medianWinningPKR ?? real.avgWinningPKR;
    return { currency, country, floor: niceRound(mid * 0.55), low: niceRound(mid * 0.8), suggested: niceRound(mid), high: niceRound(mid * 1.5), source: "real-jobs" };
  }

  const local = country ? MARKET_PRICES[country]?.prices[category.trade as keyof (typeof MARKET_PRICES)["SA"]["prices"]] : undefined;
  if (local) {
    return { currency, country, floor: niceRound(local * 0.7), low: niceRound(local), suggested: niceRound(local * 1.4), high: niceRound(local * 2.5), source: "local-research" };
  }

  const pk = category.minPricePKR ?? 1500;
  const factor = currency === "PKR" ? 1 : demoFactor(country ?? "", rates[currency as keyof typeof rates] ?? 1);
  const base = pk * factor;
  return { currency, country, floor: niceRound(base * 0.7), low: niceRound(base), suggested: niceRound(base * 1.4), high: niceRound(base * 2.5), source: "scaled" };
}

/** How an offer compares with the guide: used by the apps and the web form for the warning and the pros' hints. */
export function judgeOffer(offer: number, g: Pick<PriceGuide, "floor" | "low" | "high">): "too-low" | "low" | "good" | "high" {
  if (offer < g.floor) return "too-low";
  if (offer < g.low) return "low";
  if (offer > g.high * 1.4) return "high";
  return "good";
}
