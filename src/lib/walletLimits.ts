import { prisma } from "@/lib/prisma";
import { getExchangeRates } from "@/lib/currency";
import { demoFactor } from "@/lib/marketPrices";
import { getMarkets, marketForCity, type MarketSnapshot } from "@/lib/marketConfig";

// Wallet debt ceiling and minimum top-up PER COUNTRY, worked out automatically.
//
// Admin > Settings holds ONE pair of numbers, written for Pakistan (PKR 3000 / PKR 500). Money in every other market is in its own
// currency (SAR in Saudi Arabia ...), so those numbers cannot be copied as they are: 3000 SAR would be ~13x too generous.
// For each market the limits are the Pakistani numbers scaled by how much bigger or smaller a typical job is there
// (the same price-level factor used for the demo amounts: researched local minimum prices, else the exchange rate), rounded to a
// round number. An admin can override either number on the market's card in Markets & Launch; blank = automatic.

export interface WalletLimits {
  ceiling: number;
  minTopUp: number;
  currency: string;
  /** True when the number is the automatic one (no override set on the market). */
  autoCeiling: boolean;
  autoMinTopUp: boolean;
}

/** Round to a number people would actually write: 5s under 100, 10s under 1000, 50s above. */
export function niceRound(n: number): number {
  if (n <= 0) return 0;
  const step = n < 100 ? 5 : n < 1000 ? 10 : 50;
  return Math.max(step, Math.round(n / step) * step);
}

export async function walletLimitsForMarket(m: MarketSnapshot | null): Promise<WalletLimits> {
  const [settings, rates] = await Promise.all([prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { defaultWalletCeilingPKR: true, minTopUpPKR: true } }).catch(() => null), getExchangeRates()]);
  const baseCeiling = settings?.defaultWalletCeilingPKR ?? 3000;
  const baseMin = settings?.minTopUpPKR ?? 500;
  const currency = m?.currency ?? "PKR";
  const factor = !m || currency === "PKR" ? 1 : demoFactor(m.countryCode, rates[currency] ?? 1);
  return {
    ceiling: m?.walletCeiling ?? niceRound(baseCeiling * factor),
    minTopUp: m?.minTopUp ?? niceRound(baseMin * factor),
    currency,
    autoCeiling: m?.walletCeiling == null,
    autoMinTopUp: m?.minTopUp == null,
  };
}

/** The limits for a person in this city (a pro's wallet is created with these). */
export async function walletLimitsForCity(city: string | null | undefined): Promise<WalletLimits> {
  const market = city ? marketForCity(await getMarkets(), city) : null;
  return walletLimitsForMarket(market);
}

export async function walletLimitsForUser(userId: string): Promise<WalletLimits> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { city: true } }).catch(() => null);
  return walletLimitsForCity(u?.city);
}

export async function walletLimitsForProvider(providerProfileId: string): Promise<WalletLimits> {
  const p = await prisma.providerProfile.findUnique({ where: { id: providerProfileId }, select: { user: { select: { city: true } } } }).catch(() => null);
  return walletLimitsForCity(p?.user.city);
}
