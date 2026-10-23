import { prisma } from "@/lib/prisma";
import { encodeGeohash } from "@/lib/geo";
import { dispatchJob } from "@/lib/dispatch";
import type { z } from "zod";
import type { createJobSchema } from "@/lib/validation/job";

const EMERGENCY_BIDDING_WINDOW_MIN = 30;
const STANDARD_BIDDING_WINDOW_HOURS = 24;

export type NewJobInput = Omit<z.infer<typeof createJobSchema>, "allowDuplicate">;

// The one place a job is created and sent to pros. Used by the Customer-app route (POST /api/jobs) and by
// the admin "post on behalf of a customer" route, so both go through exactly the same bidding window,
// geohash and dispatch (market checks / caps stay with the callers).
export async function createAndDispatchJob(customerId: string, data: NewJobInput, opts: { postedByAdminId?: string } = {}) {
  let biddingClosesAt =
    data.urgency === "EMERGENCY"
      ? new Date(Date.now() + EMERGENCY_BIDDING_WINDOW_MIN * 60 * 1000)
      : new Date(Date.now() + STANDARD_BIDDING_WINDOW_HOURS * 60 * 60 * 1000);
  // A job booked for a time soon must be decided before then: bidding closes an hour before the arrival window
  // (never sooner than 30 minutes from now).
  if (data.urgency === "SCHEDULED" && data.scheduledAt) {
    const beforeStart = new Date(new Date(data.scheduledAt).getTime() - 60 * 60 * 1000);
    if (beforeStart < biddingClosesAt) biddingClosesAt = new Date(Math.max(beforeStart.getTime(), Date.now() + 30 * 60 * 1000));
  }

  const job = await prisma.job.create({
    data: {
      customerId,
      categoryId: data.categoryId,
      subServiceId: data.subServiceId,
      title: data.title,
      description: data.description,
      photos: data.photos,
      videoUrl: data.videoUrl,
      urgency: data.urgency,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      scheduledWindowMins: data.urgency === "SCHEDULED" && data.scheduledAt ? (data.scheduledWindowMins ?? 60) : undefined,
      city: data.city,
      areaLabel: data.areaLabel,
      exactAddress: data.exactAddress,
      lat: data.lat,
      lng: data.lng,
      geohash: encodeGeohash(data.lat, data.lng),
      budgetPKR: data.budgetPKR,
      biddingClosesAt,
      postedByAdminId: opts.postedByAdminId,
    },
  });

  const dispatchedCount = await dispatchJob(job);
  return { job, dispatchedCount: dispatchedCount ?? 0 };
}
