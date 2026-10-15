import { fmtCurrency, fmtMoney } from "@/lib/format";

// Typical *minimum* price a tradesperson asks for a small job in each market
// ("starting from"), in that market's own currency, so a visitor from Saudi
// Arabia sees SAR amounts that match what locals actually pay, not a currency
// conversion of the Pakistani price. Pakistan itself uses the admin-editable
// ServiceCategory.minPricePKR.
//
// Source: desk research, Oct 2026 (provider price lists, marketplaces and
// trade guides: Saudi/UAE/Qatar home-service companies, German Handwerker
// Mindesteinsatz guides, HomeAdvisor/HomeGuide/Housecall Pro for US,
// HomeStars for Canada). Trades without a direct published minimum are
// estimated from the market's hourly rates. These are indicative display
// values, not quotes. Refine them here as real marketplace data comes in.
type Trade =
  | "PLUMBER" | "ELECTRICIAN" | "AC_TECHNICIAN" | "SOLAR_INSTALLER" | "CARPENTER" | "PAINTER"
  | "APPLIANCE_REPAIR" | "CAR_MECHANIC" | "MOVERS" | "CLEANER" | "MASON" | "HANDYMAN";

interface MarketPrices {
  currency: string;
  prices: Record<Trade, number>;
}

export const MARKET_PRICES: Record<string, MarketPrices> = {
  SA: {
    currency: "SAR",
    prices: { ELECTRICIAN: 80, PLUMBER: 80, AC_TECHNICIAN: 90, HANDYMAN: 70, CLEANER: 99, CARPENTER: 100, PAINTER: 200, APPLIANCE_REPAIR: 90, CAR_MECHANIC: 100, MOVERS: 250, MASON: 150, SOLAR_INSTALLER: 550 },
  },
  AE: {
    currency: "AED",
    prices: { ELECTRICIAN: 99, PLUMBER: 120, AC_TECHNICIAN: 150, HANDYMAN: 99, CLEANER: 110, CARPENTER: 150, PAINTER: 300, APPLIANCE_REPAIR: 120, CAR_MECHANIC: 150, MOVERS: 300, MASON: 250, SOLAR_INSTALLER: 600 },
  },
  QA: {
    currency: "QAR",
    prices: { ELECTRICIAN: 100, PLUMBER: 100, AC_TECHNICIAN: 150, HANDYMAN: 100, CLEANER: 100, CARPENTER: 150, PAINTER: 250, APPLIANCE_REPAIR: 120, CAR_MECHANIC: 150, MOVERS: 300, MASON: 200, SOLAR_INSTALLER: 500 },
  },
  DE: {
    currency: "EUR",
    prices: { ELECTRICIAN: 80, PLUMBER: 70, AC_TECHNICIAN: 90, HANDYMAN: 60, CLEANER: 35, CARPENTER: 80, PAINTER: 150, APPLIANCE_REPAIR: 70, CAR_MECHANIC: 80, MOVERS: 70, MASON: 90, SOLAR_INSTALLER: 100 },
  },
  US: {
    currency: "USD",
    prices: { ELECTRICIAN: 100, PLUMBER: 90, AC_TECHNICIAN: 90, HANDYMAN: 100, CLEANER: 100, CARPENTER: 100, PAINTER: 250, APPLIANCE_REPAIR: 80, CAR_MECHANIC: 100, MOVERS: 150, MASON: 200, SOLAR_INSTALLER: 150 },
  },
  CA: {
    currency: "CAD",
    prices: { ELECTRICIAN: 100, PLUMBER: 100, AC_TECHNICIAN: 100, HANDYMAN: 75, CLEANER: 120, CARPENTER: 100, PAINTER: 300, APPLIANCE_REPAIR: 90, CAR_MECHANIC: 110, MOVERS: 160, MASON: 200, SOLAR_INSTALLER: 160 },
  },
};

const PK_BASE: Partial<Record<Trade, number>> = { ELECTRICIAN: 1000, PLUMBER: 1200, AC_TECHNICIAN: 1800 };

/**
 * How much bigger (or smaller) a typical job is in this market compared with Pakistan,
 * from the researched electrician/plumber/AC minimums. Used to scale example amounts.
 * Markets without researched data fall back to the plain exchange rate.
 */
export function demoFactor(country: string, fxRate: number): number {
  const m = MARKET_PRICES[country];
  if (!m) return fxRate;
  const ratios = (Object.keys(PK_BASE) as Trade[]).map((t) => m.prices[t] / (PK_BASE[t] as number));
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

/** The currency shown for this market: researched markets use their own currency. */
export function marketCurrency(country: string, fallback: string): string {
  return MARKET_PRICES[country]?.currency ?? fallback;
}

/**
 * "From …" label for a trade in the visitor's market: the local minimum in the
 * local currency when we have researched data for that country, otherwise
 * the Pakistani price converted for display (or exact PKR in Pakistan).
 */
export function minPriceLabel(opts: { trade: string; pkr: number | null; country: string; locale: string; currency: string; rate: number }): string | null {
  const local = MARKET_PRICES[opts.country];
  const amount = local?.prices[opts.trade as Trade];
  if (local && amount) return fmtCurrency(amount, opts.locale, local.currency);
  if (!opts.pkr) return null;
  return fmtMoney(opts.pkr, opts.locale, opts.currency, opts.rate);
}
