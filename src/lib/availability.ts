import { z } from "zod";

// A pro's working hours: any number of time windows per weekday (e.g. Mon 09:00-13:00 and 16:00-20:00, Fri 15:00-22:00).
// null means "always available" (the old behaviour). Times are minutes after local midnight in the pro's market timezone.
// Job alerts are only pushed while the pro is available; a scheduled job is checked against its own arrival window instead,
// so a pro who works Saturdays hears about Saturday jobs even when it is posted on a Tuesday night. Jobs still show in the list.

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export type Window = { start: number; end: number };
export type Availability = Record<Day, Window[]>;

const win = z.object({ start: z.number().int().min(0).max(1439), end: z.number().int().min(1).max(1440) }).refine((w) => w.end > w.start, "A window must end after it starts");
export const availabilitySchema = z.object(Object.fromEntries(DAYS.map((d) => [d, z.array(win).max(8)])) as Record<Day, z.ZodArray<typeof win>>);

/** Sorted, with overlapping or touching windows merged. */
export function normalizeAvailability(a: Availability): Availability {
  const out = {} as Availability;
  for (const d of DAYS) {
    const sorted = [...(a[d] ?? [])].sort((x, y) => x.start - y.start);
    const merged: Window[] = [];
    for (const w of sorted) {
      const last = merged[merged.length - 1];
      if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
      else merged.push({ ...w });
    }
    out[d] = merged;
  }
  return out;
}

export function parseAvailability(raw: unknown): Availability | null {
  if (raw == null) return null;
  const parsed = availabilitySchema.safeParse(raw);
  return parsed.success ? (parsed.data as Availability) : null;
}

const WEEKDAY: Record<string, Day> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };

function localDayAndMinutes(timezone: string, at: Date): { day: Day; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return { day: WEEKDAY[get("weekday")] ?? "mon", minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  } catch {
    return { day: DAYS[(at.getUTCDay() + 6) % 7], minutes: at.getUTCHours() * 60 + at.getUTCMinutes() };
  }
}

/** Is the pro working at this moment (or, for a scheduled job, during its arrival window)? Always true without working hours. */
export function isAvailable(raw: unknown, timezone: string, at = new Date(), windowMinutes = 0): boolean {
  const a = parseAvailability(raw);
  if (!a) return true;
  const { day, minutes } = localDayAndMinutes(timezone, at);
  const endMin = minutes + Math.max(0, windowMinutes);
  return (a[day] ?? []).some((w) => minutes < w.end && endMin >= w.start);
}
