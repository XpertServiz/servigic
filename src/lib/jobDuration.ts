// Booking.timeline is a { [BookingStatus]: isoTimestamp } map, written to
// incrementally by every status-changing route (bid accept, payment
// verify, status advance, confirm). This derives elapsed time between any
// two of those timestamps without needing new columns.
export function getTimelineDurationMinutes(
  timeline: unknown,
  fromStatus: string,
  toStatus: string
): number | null {
  if (!timeline || typeof timeline !== "object") return null;
  const t = timeline as Record<string, string>;
  const from = t[fromStatus];
  const to = t[toStatus];
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}
