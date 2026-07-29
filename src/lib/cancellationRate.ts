import { prisma } from "@/lib/prisma";
import { recomputeProviderStanding } from "@/lib/providerStanding";

const WINDOW_MS = 30 * 24 * 3600_000;

// Anti-Disintermediation System — rolling 30-day cancellation rate (v7 §2.3).
// Called reactively after every cancel event and every completion. The
// periodic decay sweep (recomputeAllActiveCancellationRates, wired into
// runExpirySweep) re-derives rates for users with no new triggering event so
// old cancellations still age out of the 30-day window over time.
export async function recomputeCancellationRate(userId: string, role: "CUSTOMER" | "PROVIDER"): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS);

  if (role === "PROVIDER") {
    const profile = await prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) return;
    const [totalBookings30d, cancelled30d] = await Promise.all([
      prisma.booking.count({ where: { providerId: profile.id, createdAt: { gte: since } } }),
      prisma.cancellationEvent.count({ where: { cancelledById: userId, cancelledByRole: "PROVIDER", createdAt: { gte: since } } }),
    ]);
    const rate = totalBookings30d > 0 ? cancelled30d / totalBookings30d : 0;
    await prisma.providerProfile.update({
      where: { userId },
      data: { cancellationRate30d: rate, cancellationCount30d: cancelled30d },
    });
    await recomputeProviderStanding(profile.id);
    return;
  }

  const [totalBookings30d, cancelled30d] = await Promise.all([
    prisma.booking.count({ where: { customerId: userId, createdAt: { gte: since } } }),
    // Excludes CUSTOMER_PRO_ASKED_TO_CANCEL cancellations from the customer's
    // own rate — protects the honest reporter (v7 §2.3).
    prisma.cancellationEvent.count({
      where: { cancelledById: userId, cancelledByRole: "CUSTOMER", excludedFromCancellerRate: false, createdAt: { gte: since } },
    }),
  ]);
  const rate = totalBookings30d > 0 ? cancelled30d / totalBookings30d : 0;
  await prisma.user.update({
    where: { id: userId },
    data: { cancellationRate30d: rate, cancellationCount30d: cancelled30d, postingPaused: cancelled30d >= 5 },
  });
}

export async function recomputeAllActiveCancellationRates(): Promise<void> {
  const [providers, customers] = await Promise.all([
    prisma.providerProfile.findMany({ where: { cancellationCount30d: { gt: 0 } }, select: { userId: true } }),
    prisma.user.findMany({ where: { cancellationCount30d: { gt: 0 } }, select: { id: true } }),
  ]);
  await Promise.all([
    ...providers.map((p) => recomputeCancellationRate(p.userId, "PROVIDER")),
    ...customers.map((c) => recomputeCancellationRate(c.id, "CUSTOMER")),
  ]);
}
