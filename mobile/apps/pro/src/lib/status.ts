// Enum → display label mapping (redesign spec §4.3). Backend enums such as
// ON_MY_WAY must never be rendered raw; every user-facing status goes through
// here so both apps show identical labels for the same booking.
// Shared verbatim by apps/customer and apps/pro.
import type { TDynamic } from "./i18n";

// The shared 5-step vocabulary, in order.
export const STATUS_STEPS = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE"] as const;
export type StatusStep = (typeof STATUS_STEPS)[number];

/** Index of the active step, STATUS_STEPS.length when COMPLETED (every step done), -1 when not on the timeline. */
export function statusStepIndex(status: string | undefined | null): number {
  if (!status) return -1;
  if (status === "COMPLETED") return STATUS_STEPS.length;
  return STATUS_STEPS.indexOf(status as StatusStep);
}

function humanize(value: string): string {
  const spaced = value.toLowerCase().replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type EnumGroup = "booking" | "job" | "bid" | "urgency" | "trade" | "method" | "ledger" | "payout" | "dispatch";

/**
 * Looks up `${group}.${value}` in the active locale. A value with no
 * translation yet still renders as readable words ("On my way"), never as a
 * raw ENUM_STRING.
 */
export function enumLabel(td: TDynamic, group: EnumGroup, value: string | undefined | null): string {
  if (!value) return "";
  return td(`${group}.${value}`) ?? humanize(value);
}

/** A trade's name in the app language ("trade.PLUMBER" -> "سبّاك"), or the server's (English) name when not translated. */
export function tradeLabel(t: (key: never) => string, trade: string | null | undefined, fallback: string): string {
  if (!trade) return fallback;
  const key = `trade.${trade}`;
  const v = (t as unknown as (k: string) => string)(key);
  return v && v !== key ? v : fallback;
}
