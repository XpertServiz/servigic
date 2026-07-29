import { prisma } from "@/lib/prisma";
import type { FlagType } from "@prisma/client";

const REBOOK_WINDOW_MS = 14 * 24 * 3600_000;
const LEAKAGE_WINDOW_MS = 30 * 24 * 3600_000;

// Anti-Disintermediation System — collusion-pair detection (v7 §2.4). Run as
// a cheap sweep triggered by admin traffic (called from /admin/flags), not
// wired into the site-wide runExpirySweep() — these queries scan historical
// cancellation/message data and aren't cheap enough to run on every
// customer-facing request.
async function upsertFlag(type: FlagType, providerId: string, customerId: string, evidence: object) {
  const existing = await prisma.providerFlag.findFirst({ where: { type, providerId, customerId, status: "OPEN" } });
  if (existing) {
    await prisma.providerFlag.update({ where: { id: existing.id }, data: { evidence } });
    return;
  }
  await prisma.providerFlag.create({ data: { type, providerId, customerId, evidence } });
}

// Rule 1: same (customer, provider) pair with >=2 cancelled bookings that
// had already reached CONFIRMED (every CancellationEvent implies this,
// structurally — cancellation is only reachable from CONFIRMED onward, or
// via a dispute that itself required an unlocked booking).
async function detectAcceptCancelPairs() {
  const events = await prisma.cancellationEvent.findMany({
    include: { booking: { select: { customerId: true, providerId: true } } },
  });
  const pairs = new Map<string, { customerId: string; providerId: string; bookingIds: string[] }>();
  for (const e of events) {
    const key = `${e.booking.customerId}:${e.booking.providerId}`;
    const entry = pairs.get(key) ?? { customerId: e.booking.customerId, providerId: e.booking.providerId, bookingIds: [] };
    entry.bookingIds.push(e.bookingId);
    pairs.set(key, entry);
  }
  for (const { customerId, providerId, bookingIds } of pairs.values()) {
    if (bookingIds.length >= 2) {
      await upsertFlag("COLLUSION_ACCEPT_CANCEL_PAIR", providerId, customerId, { bookingIds });
    }
  }
}

// Rule 2: pro cancels/receives-cancellation, then the customer never
// rebooks any pro for that same category within 14 days — weak signal,
// counted; 3+ occurrences for the same (customer, provider) pair flags it.
async function detectRebookAvoidance() {
  const events = await prisma.cancellationEvent.findMany({
    include: { booking: { include: { job: { select: { categoryId: true } } } } },
  });
  const avoidance = new Map<string, { customerId: string; providerId: string; bookingIds: string[] }>();
  for (const e of events) {
    const { customerId, providerId, job } = e.booking;
    const rebooked = await prisma.job.findFirst({
      where: {
        customerId,
        categoryId: job.categoryId,
        createdAt: { gt: e.createdAt, lte: new Date(e.createdAt.getTime() + REBOOK_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (rebooked) continue;
    const key = `${customerId}:${providerId}`;
    const entry = avoidance.get(key) ?? { customerId, providerId, bookingIds: [] };
    entry.bookingIds.push(e.bookingId);
    avoidance.set(key, entry);
  }
  for (const { customerId, providerId, bookingIds } of avoidance.values()) {
    if (bookingIds.length >= 3) {
      await upsertFlag("COLLUSION_REBOOK_AVOIDANCE", providerId, customerId, { bookingIds });
    }
  }
}

// Rule 3: contact-scrubber hit count per (customer, provider) pair over 30
// days — >=3 scrub events flags the pair AND auto-sets the provider's
// dispatchStatus to WARNED (only if not already at a higher severity).
async function detectLeakageAttempts() {
  const since = new Date(Date.now() - LEAKAGE_WINDOW_MS);
  const scrubbed = await prisma.message.findMany({
    where: { scrubHit: true, createdAt: { gte: since } },
    include: { booking: { select: { customerId: true, providerId: true } } },
  });
  const counts = new Map<string, { customerId: string; providerId: string; bookingIds: Set<string>; count: number }>();
  for (const m of scrubbed) {
    const key = `${m.booking.customerId}:${m.booking.providerId}`;
    const entry = counts.get(key) ?? { customerId: m.booking.customerId, providerId: m.booking.providerId, bookingIds: new Set<string>(), count: 0 };
    entry.count += 1;
    entry.bookingIds.add(m.bookingId);
    counts.set(key, entry);
  }
  for (const { customerId, providerId, bookingIds, count } of counts.values()) {
    if (count < 3) continue;
    await upsertFlag("CONTACT_LEAKAGE_ATTEMPTS", providerId, customerId, { bookingIds: [...bookingIds], scrubHitCount: count });
    const profile = await prisma.providerProfile.findUnique({ where: { id: providerId } });
    if (profile && profile.dispatchStatus === "NORMAL") {
      await prisma.providerProfile.update({
        where: { id: providerId },
        data: { dispatchStatus: "WARNED", dispatchBlockedReason: "CONTACT_LEAKAGE" },
      });
    }
  }
}

export async function runCollusionDetection(): Promise<void> {
  await Promise.all([detectAcceptCancelPairs(), detectRebookAvoidance(), detectLeakageAttempts()]);
}
