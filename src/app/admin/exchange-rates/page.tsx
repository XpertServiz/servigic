import { getExchangeRates } from "@/lib/currency";
import { ExchangeRatesForm } from "./ExchangeRatesForm";

export default async function AdminExchangeRatesPage() {
  const rates = await getExchangeRates();

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Exchange Rates</h1>
      <p className="mb-8 text-text-muted">
        Display-only conversion rates from PKR — used to show approximate prices to visitors browsing from other
        countries. Every real transaction still happens in PKR (see GCC_EXPANSION.md). No live FX API is wired, so
        update these manually as needed.
      </p>
      <ExchangeRatesForm initialRates={rates} />
    </div>
  );
}
