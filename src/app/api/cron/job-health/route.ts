import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyJobsWithoutBids } from "@/lib/jobHealth";
import { sendUnbidJobFallbacks } from "@/lib/jobAlertFallback";
import { runExpirySweep } from "@/lib/expiry";
import { notifyFoundingEndingSoon } from "@/lib/foundingPro";
import { sendScheduleReminders } from "@/lib/scheduleReminders";
import { cleanupJobMedia } from "@/lib/jobMediaCleanup";
import { warnRequestsClosingSoon } from "@/lib/requestLifecycle";
import { sweepDocumentExpiry } from "@/lib/proDocuments";

// Called every 15 minutes by .github/workflows/job-health.yml: tells customers
// whose job has no bids yet, and runs the (flag-gated, stubbed) SMS/WhatsApp fallback.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Called every 15 minutes. The job sweeps only run when there is a job in progress (otherwise they would find nothing); the slow-moving
  // ones (founding-pro reminders, document expiry, media cleanup) run once an hour.
  const hourly = new Date().getUTCMinutes() < 15;
  const activeJobs = await prisma.job.count({ where: { status: { in: ["OPEN", "BOOKED", "IN_PROGRESS", "DISPUTED"] } } });

  let noBids: number | null = null;
  let fallback: unknown = null;
  let scheduleReminders: number | null = null;
  let closingSoonWarned: number | null = null;
  if (activeJobs > 0) {
    await runExpirySweep();
    [noBids, fallback] = await Promise.all([notifyJobsWithoutBids(), sendUnbidJobFallbacks()]);
    // Scheduled jobs: reminders the day before and an hour before the arrival window.
    scheduleReminders = await sendScheduleReminders().catch((e) => (console.error("[schedule]", e), 0));
    // Requests about to close without a chosen pro: warn the customer, with "Keep my request open".
    closingSoonWarned = await warnRequestsClosingSoon().catch(() => 0);
  }

  let foundingReminders: number | null = null;
  let documents: unknown = null;
  let mediaCleanup: unknown = null;
  if (hourly) {
    // 14 days before a Founding Pro's reduced rate ends, tell them the date it goes back to the standard rate.
    foundingReminders = await notifyFoundingEndingSoon().catch(() => 0);
    // Pro documents: expiry reminders, and pausing job access past the grace period.
    documents = await sweepDocumentExpiry().catch((e) => (console.error("[documents]", e), null));
    // Job photos/videos are deleted 24 hours after the job ended (keeps UploadThing storage small).
    mediaCleanup = await cleanupJobMedia().catch((e) => (console.error("[media-cleanup]", e), null));
  }
  return NextResponse.json({ activeJobs, hourly, noBidsNotified: noBids, fallback, foundingReminders, scheduleReminders, closingSoonWarned, documents, mediaCleanup });
}
