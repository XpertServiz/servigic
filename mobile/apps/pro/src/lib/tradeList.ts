import { useEffect, useState } from "react";
import * as api from "./api";
import { runtimeTradeNames } from "./status";

// The trades a pro can pick (the server also checks that each is switched on in his area). Names: i18n keys trade.<NAME>.
export const TRADES = ["PLUMBER", "ELECTRICIAN", "AC_TECHNICIAN", "SOLAR_INSTALLER", "CARPENTER", "PAINTER", "APPLIANCE_REPAIR", "CAR_MECHANIC", "TOWING", "MOVERS", "CLEANER", "MASON", "HANDYMAN"];
export const MAX_SIGNUP_TRADES = 3;

/** The fixed trades plus the categories an admin created in Admin > Categories. */
export function useTradeOptions(): string[] {
  const [custom, setCustom] = useState<string[]>(Object.keys(runtimeTradeNames));
  useEffect(() => {
    api
      .getPublicTrades()
      .then(({ trades }) => {
        const keys = trades.filter((x) => x.trade.startsWith("CUSTOM_"));
        keys.forEach((x) => (runtimeTradeNames[x.trade] = x.name));
        setCustom(keys.map((x) => x.trade));
      })
      .catch(() => {});
  }, []);
  return [...TRADES, ...custom];
}
