import { prisma } from "@/lib/prisma";

// Cancelling after the pro has left. Before he is "on the way" it is free. Once he is on the way, the customer owes a fee
// (a share of the price, Admin > Settings); once he has arrived, a larger one. The fee compensates the pro for the trip: it
// is added to what the customer owes (he cannot post a new request until it is cleared) and, when the admin marks it paid,
// the pro's share goes into his wallet. Free when the pro caused it (he asked the customer to cancel, or was late).
export const FEE_WAIVED_REASONS = ["CUSTOMER_PRO_ASKED_TO_CANCEL", "CUSTOMER_PRO_LATE"];
/** A customer with this many fee-incurring cancellations in the last 60 days reaches half as many pros. */
export const LATE_CANCEL_LIMIT = 3;
export const LATE_CANCEL_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export async function cancelFeeRates() {
  const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { cancelFeeOnWayPct: true, cancelFeeArrivedPct: true } }).catch(() => null);
  return { onWay: s?.cancelFeeOnWayPct ?? 10, arrived: s?.cancelFeeArrivedPct ?? 15 };
}

/** The fee for cancelling a booking in this status (0 before the pro has left). Amounts are whole units of the market currency. */
export function feeFor(status: string, totalPKR: number, rates: { onWay: number; arrived: number }): number {
  const pct = status === "ARRIVED" ? rates.arrived : status === "ON_MY_WAY" ? rates.onWay : 0;
  return Math.round((totalPKR * pct) / 100);
}

export function hasLateCancelPenalty(u: { lateCancelCount: number; lastLateCancelAt: Date | null }, now = Date.now()): boolean {
  return u.lateCancelCount >= LATE_CANCEL_LIMIT && u.lastLateCancelAt != null && now - u.lastLateCancelAt.getTime() <= LATE_CANCEL_WINDOW_MS;
}
