import { NextResponse } from "next/server";
import { notifyJobsWithoutBids } from "@/lib/jobHealth";
import { sendUnbidJobFallbacks } from "@/lib/jobAlertFallback";
import { runExpirySweep } from "@/lib/expiry";
import { notifyFoundingEndingSoon } from "@/lib/foundingPro";
import { sendScheduleReminders } from "@/lib/scheduleReminders";
import { cleanupJobMedia } from "@/lib/jobMediaCleanup";
import { warnRequestsClosingSoon } from "@/lib/requestLifecycle";

// Called every ~10 minutes by .github/workflows/job-health.yml: tells customers
// whose job has no bids yet, and runs the (flag-gated, stubbed) SMS/WhatsApp fallback.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await runExpirySweep();
  const [noBids, fallback] = await Promise.all([notifyJobsWithoutBids(), sendUnbidJobFallbacks()]);
  // 14 days before a Founding Pro's reduced rate ends, tell them the date it goes back to the standard rate.
  const foundingReminders = await notifyFoundingEndingSoon().catch(() => 0);
  // Scheduled jobs: reminders the day before and an hour before the arrival window.
  const scheduleReminders = await sendScheduleReminders().catch((e) => (console.error("[schedule]", e), 0));
  // Job photos/videos are deleted 24 hours after the job ended (keeps UploadThing storage small).
  // Requests about to close without a chosen pro: warn the customer, with "Keep my request open".
  const closingSoonWarned = await warnRequestsClosingSoon().catch(() => 0);
  const mediaCleanup = await cleanupJobMedia().catch((e) => (console.error("[media-cleanup]", e), null));
  return NextResponse.json({ noBidsNotified: noBids, fallback, foundingReminders, scheduleReminders, closingSoonWarned, mediaCleanup });
}
