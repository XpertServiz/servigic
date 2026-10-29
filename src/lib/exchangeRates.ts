import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Currency } from "@prisma/client";

// Weekly refresh of the exchange rates (units of currency per 1 PKR) from a free public source (open.er-api.com, no key;
// "Rates By Exchange Rate API" - https://www.exchangerate-api.com). Called by .github/workflows/exchange-rates.yml.
export async function refreshExchangeRates(): Promise<{ updated: Record<string, number> }> {
  const res = await fetch("https://open.er-api.com/v6/latest/PKR", { cache: "no-store" });
  if (!res.ok) throw new Error(`Exchange rate source answered ${res.status}`);
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  if (data.result !== "success" || !data.rates) throw new Error("Exchange rate source returned no rates");
  const updated: Record<string, number> = {};
  for (const code of ["USD", "CAD", "EUR", "PLN", "SAR", "AED", "QAR"] as Currency[]) {
    const rate = data.rates[code];
    if (typeof rate === "number" && rate > 0) {
      await prisma.exchangeRate.upsert({ where: { currency: code }, update: { ratePerPKR: rate }, create: { currency: code, ratePerPKR: rate } });
      updated[code] = rate;
    }
  }
  try {
    revalidateTag("exchange-rates", "max");
  } catch {
    // not inside a request (scripts): the 5-minute cache expires by itself
  }
  return { updated };
}
