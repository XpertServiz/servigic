import { prisma } from "@/lib/prisma";

// Everyone who can review Pro verifications: full admins plus SUPPORT
// reviewers (who only get the /admin/verification queue).
export async function listReviewStaff() {
  return prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPPORT"] } }, select: { id: true, name: true } });
}

// A submission is waiting for review when both documents are in, the pro isn't
// verified yet and the latest submission hasn't already been rejected.
export function isAwaitingReview(p: {
  isVerified: boolean;
  verificationLevel: number;
  cnicUrl: string | null;
  selfieUrl: string | null;
  verificationSubmittedAt: Date | null;
  verificationRejectedAt: Date | null;
}): boolean {
  if (p.isVerified || p.verificationLevel >= 1 || !p.cnicUrl || !p.selfieUrl) return false;
  if (p.verificationRejectedAt && (!p.verificationSubmittedAt || p.verificationSubmittedAt <= p.verificationRejectedAt)) return false;
  return true;
}

export const VERIFICATION_SLA_HOURS = 24;

/** Whole hours since a date (kept out of components, which must stay pure). */
export function hoursSince(date: Date): number {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 36e5));
}
