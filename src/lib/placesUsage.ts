import { prisma } from "@/lib/prisma";

// A hard monthly stop for Google Places requests, so the project can never be billed for them. Google gives about
// FREE_PER_MONTH free requests a month; every request this code sends is counted here, and once the count reaches
// GOOGLE_PLACES_MONTHLY_LIMIT (.env, default 900, a safety margin under the free amount) no more requests are sent until the
// next month. Google's months follow Pacific time, and the allowance renews on the 1st.
export const FREE_PER_MONTH = 1000;

export function monthlyLimit(): number {
  const n = Number(process.env.GOOGLE_PLACES_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 900;
}

function pacificParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).formatToParts(d);
  return { year: Number(p.find((x) => x.type === "year")?.value), month: Number(p.find((x) => x.type === "month")?.value) };
}

export function currentMonthKey(d = new Date()): string {
  const { year, month } = pacificParts(d);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "1 November 2026 (Pacific time)": when Google's free allowance renews. */
export function resetLabel(d = new Date()): string {
  const { year, month } = pacificParts(d);
  const next = new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, 1));
  return `${next.getUTCDate()} ${next.toLocaleString("en-GB", { month: "long", timeZone: "UTC" })} ${next.getUTCFullYear()} (Pacific time)`;
}

export type PlacesUsageView = { used: number; limit: number; left: number; free: number; resetsOn: string };

export async function placesUsage(): Promise<PlacesUsageView> {
  const row = await prisma.placesUsage.findUnique({ where: { month: currentMonthKey() } }).catch(() => null);
  const used = row?.requests ?? 0;
  const limit = monthlyLimit();
  return { used, limit, left: Math.max(0, limit - used), free: FREE_PER_MONTH, resetsOn: resetLabel() };
}

export class PlacesLimitError extends Error {}

export function limitMessage(u: PlacesUsageView): string {
  return `Monthly Google limit reached: ${u.used} of ${u.limit} requests used (Google's free allowance is about ${u.free} a month). Lead fetching is paused so you are never charged. It works again on ${u.resetsOn}, when Google's free allowance renews.`;
}

/** Counts one request to Google, or throws PlacesLimitError when the monthly stop is reached (nothing is sent then). */
export async function takePlacesRequest(): Promise<void> {
  const month = currentMonthKey();
  const row = await prisma.placesUsage.upsert({ where: { month }, update: { requests: { increment: 1 } }, create: { month, requests: 1 } });
  const limit = monthlyLimit();
  if (row.requests > limit) {
    await prisma.placesUsage.update({ where: { month }, data: { requests: { decrement: 1 } } }).catch(() => {});
    throw new PlacesLimitError(limitMessage({ used: limit, limit, left: 0, free: FREE_PER_MONTH, resetsOn: resetLabel() }));
  }
}
