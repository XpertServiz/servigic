// The money label the apps show. Amounts are stored in whole currency units of the user's market (the fields are called ...PKR
// for historical reasons), so a pro in Jeddah sees "SAR 150" and one in Karachi "PKR 1,500". The code comes from the market the
// backend reports for the user's country / city (see market.ts) and is remembered on the device, so it is right from the first
// screen. Shared verbatim by apps/customer and apps/pro.
import * as SecureStore from "expo-secure-store";

const KEY = "servigic_currency";
let code = "PKR";

SecureStore.getItemAsync(KEY)
  .then((saved) => {
    if (saved && /^[A-Z]{3}$/.test(saved)) code = saved;
  })
  .catch(() => {});

export const currencyCode = () => code;

export function setCurrencyCode(next: string | null | undefined) {
  if (!next || !/^[A-Z]{3}$/.test(next) || next === code) return;
  code = next;
  SecureStore.setItemAsync(KEY, next).catch(() => {});
}

/** Replaces the word PKR in a finished string with the user's currency (no-op for Pakistan). */
export function localiseMoney(text: string): string {
  return code === "PKR" ? text : text.replace(/\bPKR\b/g, code);
}
