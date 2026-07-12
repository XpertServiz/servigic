"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Currency } from "@prisma/client";

const EDITABLE_CURRENCIES: { code: Currency; label: string }[] = [
  { code: "USD", label: "US Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "PLN", label: "Polish Złoty" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "AED", label: "UAE Dirham" },
  { code: "QAR", label: "Qatari Riyal" },
];

export function ExchangeRatesForm({ initialRates }: { initialRates: Record<Currency, number> }) {
  const [rates, setRates] = useState(initialRates);
  const [savingCurrency, setSavingCurrency] = useState<Currency | null>(null);

  async function save(currency: Currency) {
    setSavingCurrency(currency);
    try {
      const res = await fetch("/api/admin/exchange-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, ratePerPKR: rates[currency] }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${currency} rate saved`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingCurrency(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {EDITABLE_CURRENCIES.map(({ code, label }) => (
        <div key={code} className="flex items-center gap-3 rounded-[10px] border border-border-subtle bg-bg-elevated p-4">
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {code} <span className="text-text-muted">— {label}</span>
            </div>
            <div className="text-xs text-text-muted">PKR 1,000 ≈ {(rates[code] * 1000).toFixed(2)} {code}</div>
          </div>
          <input
            type="number"
            step="0.0001"
            value={rates[code]}
            onChange={(e) => setRates({ ...rates, [code]: Number(e.target.value) })}
            className="w-32 rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />
          <button
            onClick={() => save(code)}
            disabled={savingCurrency === code}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            Save
          </button>
        </div>
      ))}
    </div>
  );
}
