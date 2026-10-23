// Scheduling a job, the way ride apps reserve a ride: pick a day first, then a one-hour arrival window on that day (or "any time
// that day" for more bids). Times are the device's local time. Same file in the apps (mobile/apps/pro/src/lib/scheduleSlots.ts).

export const DAYS_AHEAD = 21; // how far ahead a job can be booked
export const LEAD_MINUTES = 120; // the first window must start at least 2 hours from now
export const FIRST_HOUR = 8; // 08:00
export const LAST_HOUR = 21; // the last window ends at 21:00
export const WINDOW_MINUTES = 60;

export interface Slot {
  start: Date;
  minutes: number;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const at = (day: Date, hour: number, minute = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);

/** The one-hour arrival windows still bookable on `day`. */
export function slotsFor(day: Date, now = new Date()): Slot[] {
  const earliest = now.getTime() + LEAD_MINUTES * 60_000;
  const out: Slot[] = [];
  for (let h = FIRST_HOUR; h + WINDOW_MINUTES / 60 <= LAST_HOUR; h++) {
    const start = at(day, h);
    if (start.getTime() >= earliest) out.push({ start, minutes: WINDOW_MINUTES });
  }
  return out;
}

/** "Any time that day": from the first bookable window to the end of the working day. */
export function flexibleFor(day: Date, now = new Date()): Slot | null {
  const slots = slotsFor(day, now);
  if (slots.length === 0) return null;
  const start = slots[0].start;
  return { start, minutes: Math.round((at(day, LAST_HOUR).getTime() - start.getTime()) / 60_000) };
}

/** The days that still have at least one window, starting today. */
export function bookableDays(now = new Date()): Date[] {
  const today = startOfDay(now);
  const days: Date[] = [];
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (slotsFor(d, now).length > 0) days.push(d);
  }
  return days;
}

export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export type DayPart = "morning" | "afternoon" | "evening";
export const dayPart = (d: Date): DayPart => (d.getHours() < 12 ? "morning" : d.getHours() < 17 ? "afternoon" : "evening");

/** "09:00" in the reader's locale. */
export function timeLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

/** "Sat 25 Oct" in the reader's locale. */
export function dateLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(d);
  } catch {
    return d.toDateString();
  }
}

/** "Sat 25 Oct, 09:00–10:00" (or "Sat 25 Oct, any time 10:00–21:00"), in a given time zone when known. */
export function windowText(startIso: string | Date, minutes: number | null | undefined, locale: string, timeZone?: string): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + (minutes ?? WINDOW_MINUTES) * 60_000);
  const opts = timeZone ? { timeZone } : {};
  try {
    const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", ...opts }).format(start);
    const t = (d: Date) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", ...opts }).format(d);
    return `${date}, ${t(start)}–${t(end)}`;
  } catch {
    return start.toISOString();
  }
}
