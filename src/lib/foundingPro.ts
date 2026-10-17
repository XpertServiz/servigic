import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { foundingText } from "@/lib/foundingTexts";

// Founding Pro (business rule): the first N approved pros in the launch city (default 100, Karachi) pay a reduced
// commission (default 10%) for M months (default 3) from their approval date; after that the standard rate (their
// commissionPct, 12% by default) applies again, automatically - the reduced rate is only ever read while
// foundingUntil is in the future, nothing has to be switched back. All numbers are editable in Admin > Settings.

export interface FoundingRule {
  slots: number;
  pct: number;
  months: number;
  city: string;
}

export async function getFoundingRule(): Promise<FoundingRule> {
  const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  return { slots: s?.foundingProSlots ?? 100, pct: s?.foundingProPct ?? 10, months: s?.foundingProMonths ?? 3, city: s?.foundingProCity ?? "Karachi" };
}

/** Places given out so far (a place is used for good, even after the 3 months end) and how many are left. */
export async function foundingSlotsLeft(): Promise<{ used: number; left: number; rule: FoundingRule }> {
  const rule = await getFoundingRule();
  const used = await prisma.providerProfile.count({ where: { foundingUntil: { not: null } } });
  return { used, left: Math.max(0, rule.slots - used), rule };
}

/** The commission % that applies to this pro right now. */
export function effectiveCommissionPct(profile: { commissionPct: number; foundingUntil: Date | null }, rule: Pick<FoundingRule, "pct">, now = new Date()): number {
  return profile.foundingUntil && profile.foundingUntil.getTime() > now.getTime() ? rule.pct : profile.commissionPct;
}

/** Called when a pro is approved. Gives the Founding Pro rate if the pro is in the launch city and places remain. */
export async function grantFoundingProIfEligible(profileId: string, now = new Date()): Promise<boolean> {
  const profile = await prisma.providerProfile.findUnique({ where: { id: profileId }, include: { user: { select: { id: true, city: true, language: true } } } });
  if (!profile || profile.foundingUntil) return false;
  const { left, rule } = await foundingSlotsLeft();
  if (left <= 0 || !profile.user.city || profile.user.city.trim().toLowerCase() !== rule.city.trim().toLowerCase()) return false;

  const until = new Date(now);
  until.setMonth(until.getMonth() + rule.months);
  await prisma.providerProfile.update({ where: { id: profileId }, data: { foundingPro: true, foundingUntil: until } });

  // Two approvals at the same moment could both pass the check above: if that overshot the limit, undo this one.
  const used = await prisma.providerProfile.count({ where: { foundingUntil: { not: null } } });
  if (used > rule.slots) {
    await prisma.providerProfile.update({ where: { id: profileId }, data: { foundingPro: false, foundingUntil: null } });
    return false;
  }
  await notify({
    userId: profile.user.id,
    type: "SYSTEM",
    title: foundingText(profile.user.language, "founding_title", { date: until }),
    body: foundingText(profile.user.language, "founding_body", { pct: rule.pct, date: until }),
    linkUrl: "/pro/earnings",
  }).catch(() => {});
  return true;
}

/** Run regularly: 14 days before the reduced rate ends, tell the pro the date it goes back to the standard rate. */
export async function notifyFoundingEndingSoon(now = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const due = await prisma.providerProfile.findMany({
    where: { foundingUntil: { gt: now, lte: soon }, foundingEndNotifiedAt: null },
    select: { id: true, userId: true, foundingUntil: true, commissionPct: true, user: { select: { language: true } } },
    take: 200,
  });
  for (const p of due) {
    await notify({
      userId: p.userId,
      type: "SYSTEM",
      title: foundingText(p.user.language, "ending_title", { date: p.foundingUntil! }),
      body: foundingText(p.user.language, "ending_body", { date: p.foundingUntil!, standardPct: p.commissionPct }),
      linkUrl: "/pro/earnings",
    }).catch(() => {});
    await prisma.providerProfile.update({ where: { id: p.id }, data: { foundingEndNotifiedAt: new Date() } });
  }
  return due.length;
}
