"use client";
import { createContext, useContext } from "react";
import { useLocale } from "next-intl";
import { fmtCurrency, fmtDemo } from "@/lib/format";

interface Demo {
  currency: string;
  factor: number;
}
const Ctx = createContext<Demo>({ currency: "PKR", factor: 1 });

/** Makes the visitor's market currency available to client components that show example amounts. */
export function DemoMoneyProvider({ value, children }: { value: Demo; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMoney() {
  const { currency, factor } = useContext(Ctx);
  const locale = useLocale();
  return {
    currency,
    factor,
    price: (pkr: number) => fmtDemo(pkr, locale, currency, factor),
    zero: currency === "PKR" ? "PKR 0" : fmtCurrency(0, locale, currency),
  };
}
