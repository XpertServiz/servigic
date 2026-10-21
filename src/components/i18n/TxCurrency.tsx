"use client";

import { createContext, useContext } from "react";

// The currency label for money in the customer and pro dashboards: the user's own market's currency (SAR in Jeddah, PKR in
// Karachi). Amounts are whole units of that currency; the database fields keep their old "...PKR" names.
const Ctx = createContext("PKR");

export function TxCurrencyProvider({ code, children }: { code: string; children: React.ReactNode }) {
  return <Ctx.Provider value={code}>{children}</Ctx.Provider>;
}

export const useTxCurrency = () => useContext(Ctx);
