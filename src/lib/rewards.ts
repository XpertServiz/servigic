import { prisma } from "@/lib/prisma";

// Customer rewarded-ad discount rules (handoff spec section 7):
// - watching a rewarded ad earns one flat PKR 50 credit (never a percentage)
// - at most 2 credits earned per customer per rolling 7 days
// - a credit is applied to the customer's next completed booking only - one
//   credit per booking, credits never stack on a single booking
// All of it is enforced here on the server; the app only shows the state.
export const AD_DISCOUNT_PKR = 50;
export const AD_DISCOUNT_WEEKLY_LIMIT = 2;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAdDiscountState(customerId: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [recent, pendingCredits] = await Promise.all([
    prisma.rewardCredit.findMany({
      where: { customerId, kind: "AD_DISCOUNT", earnedAt: { gte: since } },
      orderBy: { earnedAt: "asc" },
      select: { earnedAt: true },
    }),
    prisma.rewardCredit.count({ where: { customerId, kind: "AD_DISCOUNT", consumedAt: null } }),
  ]);

  const earnedThisWeek = recent.length;
  // The window frees up when the oldest of the counted credits turns 7 days old.
  const nextAvailableAt =
    earnedThisWeek >= AD_DISCOUNT_WEEKLY_LIMIT ? new Date(recent[earnedThisWeek - AD_DISCOUNT_WEEKLY_LIMIT].earnedAt.getTime() + WINDOW_MS) : null;

  return {
    amountPKR: AD_DISCOUNT_PKR,
    weeklyLimit: AD_DISCOUNT_WEEKLY_LIMIT,
    earnedThisWeek,
    remainingThisWeek: Math.max(0, AD_DISCOUNT_WEEKLY_LIMIT - earnedThisWeek),
    pendingCredits,
    nextAvailableAt,
  };
}

/**
 * Applies at most one pending credit to a booking that just reached DONE.
 * The discount comes out of Servigic's commission (the customer pays the pro
 * less, the pro's net is unchanged), so it is capped at that booking's
 * commission. Returns the PKR discount applied (0 if none).
 */
export async function applyAdDiscountToBooking(booking: { id: string; customerId: string; commissionPKR: number }): Promise<number> {
  if (booking.commissionPKR <= 0) return 0;

  const credit = await prisma.rewardCredit.findFirst({
    where: { customerId: booking.customerId, kind: "AD_DISCOUNT", consumedAt: null },
    orderBy: { earnedAt: "asc" },
  });
  if (!credit) return 0;

  // Atomic claim: if two requests race for the same credit, only one wins.
  const claimed = await prisma.rewardCredit.updateMany({
    where: { id: credit.id, consumedAt: null },
    data: { consumedAt: new Date(), bookingId: booking.id },
  });
  if (claimed.count !== 1) return 0;

  const discount = Math.min(credit.amountPKR, booking.commissionPKR);
  await prisma.booking.update({ where: { id: booking.id }, data: { rewardDiscountPKR: discount } });
  return discount;
}

// A referral credit may take at most this share of one job's price (so a credit never makes a job free).
const REFERRAL_MAX_SHARE = 0.5;

/**
 * Applies pending REFERRAL credits (oldest first, whole credits only) to a booking that just reached DONE.
 * Like the ad discount, the customer pays the pro that much less; unlike it, the discount is NOT capped at the
 * commission - whatever exceeds the commission is paid into the pro's wallet when the job completes, so the
 * pro always nets the agreed price. Adds to booking.rewardDiscountPKR and returns the PKR applied.
 */
export async function applyReferralCreditsToBooking(booking: { id: string; customerId: string; totalPKR: number }): Promise<number> {
  const current = await prisma.booking.findUnique({ where: { id: booking.id }, select: { rewardDiscountPKR: true } });
  let room = Math.floor(booking.totalPKR * REFERRAL_MAX_SHARE) - (current?.rewardDiscountPKR ?? 0);
  if (room <= 0) return 0;

  const credits = await prisma.rewardCredit.findMany({
    where: { customerId: booking.customerId, kind: "REFERRAL", consumedAt: null },
    orderBy: { earnedAt: "asc" },
  });
  let applied = 0;
  for (const credit of credits) {
    if (credit.amountPKR > room) break;
    // Atomic claim: only one concurrent request can consume a given credit.
    const claimed = await prisma.rewardCredit.updateMany({ where: { id: credit.id, consumedAt: null }, data: { consumedAt: new Date(), bookingId: booking.id } });
    if (claimed.count !== 1) continue;
    applied += credit.amountPKR;
    room -= credit.amountPKR;
  }
  if (applied > 0) await prisma.booking.update({ where: { id: booking.id }, data: { rewardDiscountPKR: { increment: applied } } });
  return applied;
}
