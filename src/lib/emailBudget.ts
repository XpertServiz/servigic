import { prisma } from "@/lib/prisma";

// Job-alert emails to offline pros must stay inside Resend's FREE plan (100 emails/day, 3,000/month). Alert emails are
// capped well below that so the account never goes over, and the remainder is left for sign-up codes and receipts
// (which also use Resend). Override with EMAIL_DAILY_LIMIT / EMAIL_MONTHLY_LIMIT if you move to a paid plan.
export const EMAIL_DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT) || 80;
export const EMAIL_MONTHLY_LIMIT = Number(process.env.EMAIL_MONTHLY_LIMIT) || 2500;
/** One pro never gets more than this many job-alert emails in 24 hours (no spamming a single inbox). */
export const EMAIL_PER_PRO_PER_DAY = 3;

/** How many more alert emails may be sent right now (never negative). */
export async function alertEmailsLeft(now = new Date()): Promise<number> {
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [today, month] = await Promise.all([
    prisma.dispatchAlert.count({ where: { channels: { has: "email" }, createdAt: { gte: startOfDay } } }),
    prisma.dispatchAlert.count({ where: { channels: { has: "email" }, createdAt: { gte: startOfMonth } } }),
  ]);
  return Math.max(0, Math.min(EMAIL_DAILY_LIMIT - today, EMAIL_MONTHLY_LIMIT - month));
}

/** Per-provider count of alert emails in the last 24 hours. */
export async function recentEmailCounts(providerIds: string[], now = new Date()): Promise<Map<string, number>> {
  if (providerIds.length === 0) return new Map();
  const rows = await prisma.dispatchAlert.groupBy({
    by: ["providerId"],
    where: { providerId: { in: providerIds }, channels: { has: "email" }, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.providerId, r._count._all]));
}
