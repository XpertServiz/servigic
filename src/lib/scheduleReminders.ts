import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { getMarkets, marketForCity } from "@/lib/marketConfig";
import { windowText } from "@/lib/scheduleSlots";

// Reminders for scheduled jobs, like a reserved ride: the day before and an hour before the arrival window, to the customer
// and to the booked pro. A scheduled job with no pro booked yet the day before tells the customer to choose a bid.
// Runs from the job-health cron (every ~10 minutes); `scheduleReminder` makes sure each reminder goes out once.

const HOUR = 60 * 60 * 1000;

export async function sendScheduleReminders(now = new Date()): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: {
      urgency: "SCHEDULED",
      scheduledAt: { gt: now, lte: new Date(now.getTime() + 25 * HOUR) },
      status: { in: ["OPEN", "BOOKED"] },
      OR: [{ scheduleReminder: null }, { scheduleReminder: "24h" }],
    },
    select: { id: true, title: true, city: true, status: true, scheduledAt: true, scheduledWindowMins: true, scheduleReminder: true, customerId: true, booking: { select: { id: true, providerUserId: true } } },
    take: 200,
  });
  if (jobs.length === 0) return 0;
  const markets = await getMarkets();
  let sent = 0;

  for (const job of jobs) {
    const left = job.scheduledAt!.getTime() - now.getTime();
    const which = left <= 75 * 60 * 1000 ? "1h" : left <= 24 * HOUR && job.scheduleReminder === null ? "24h" : null;
    if (!which || job.scheduleReminder === which) continue;
    const when = windowText(job.scheduledAt!, job.scheduledWindowMins, "en-GB", marketForCity(markets, job.city)?.timezone);

    if (job.booking) {
      const title = which === "1h" ? "Your job starts within the hour" : "Reminder: your job is tomorrow";
      await notify({ userId: job.customerId, type: "SYSTEM", title, body: `${job.title}: the pro arrives ${when}.`, linkUrl: `/bookings/${job.booking.id}` }).catch(() => null);
      await notify({ userId: job.booking.providerUserId, type: "SYSTEM", title: which === "1h" ? "Leave soon for your next job" : "Reminder: you have a job tomorrow", body: `${job.title}: arrive ${when}.`, linkUrl: `/pro/bookings/${job.booking.id}` }).catch(() => null);
      sent += 2;
    } else if (job.status === "OPEN") {
      await notify({
        userId: job.customerId,
        type: "SYSTEM",
        title: which === "1h" ? "No pro booked yet for your job" : "Choose a pro for tomorrow's job",
        body: `${job.title} (${when}): open your bids and pick a pro so they can plan the visit.`,
        linkUrl: `/jobs/${job.id}`,
      }).catch(() => null);
      sent += 1;
    }
    await prisma.job.update({ where: { id: job.id }, data: { scheduleReminder: which } });
  }
  return sent;
}
