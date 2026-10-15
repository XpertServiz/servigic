import { randomInt } from "crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { phoneVariants } from "@/lib/phone";
import { postJournalEntry, SYSTEM_ACCOUNTS } from "@/lib/accounting/postJournalEntry";

// Referral programme. Every user gets a code; someone who signs up with it becomes a PENDING Referral.
//
//  New CUSTOMER: PKR {referralNewCustomerDiscountPKR} off their first job worth at least
//    {referralNewCustomerMinJobPKR} (applied when the job reaches DONE, see applyReferralWelcomeDiscount).
//    The referrer is rewarded once that discounted job is COMPLETED (and paid).
//  New PRO: 0% commission on their first {referralNewProFreeJobs} jobs (granted at signup through the same
//    commissionFreeJobsLeft counter the early-pro perk uses). The referrer is rewarded once the new pro has
//    completed {referralProJobsRequired} jobs.
//  Referrer reward (never cash): a referring PRO gets a commission credit in their pro wallet; a referring
//    CUSTOMER gets a booking credit (RewardCredit) that comes off a future job.
// Every amount and job count is an admin setting, frozen onto the Referral at signup.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const MAX_REFERRALS_PER_DAY = 20;

export const digitsOnly = (phone: string) => phone.replace(/\D/g, "");

function randomCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `SRV${s}`;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // unique collision - try another
    }
  }
  throw new Error("Could not allocate a referral code");
}

export type AttachResult = { status: "off" | "invalid" | "applied" | "rejected"; reason?: string };

/** Called at signup. Never throws for bad input: a wrong code must not block someone from creating an account. */
export async function attachReferral(input: { newUserId: string; role: Role; phone: string; code?: string | null; deviceId?: string | null }): Promise<AttachResult> {
  const { newUserId, role, phone } = input;
  const deviceId = input.deviceId?.trim() || null;

  // Always remember the signup device: it is what lets us spot repeat sign-ups from one phone later.
  if (deviceId) await prisma.user.update({ where: { id: newUserId }, data: { signupDeviceId: deviceId } }).catch(() => {});

  const code = input.code?.trim().toUpperCase();
  if (!code) return { status: "invalid" };

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.referralsEnabled) return { status: "off" };

  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, role: true, phone: true, signupDeviceId: true } });
  // Customers and pros can both invite either kind of newcomer.
  if (!referrer || (referrer.role !== "CUSTOMER" && referrer.role !== "PROVIDER")) return { status: "invalid" };

  const phoneKey = digitsOnly(phone);
  const referredPro = role === "PROVIDER";
  const referrerIsPro = referrer.role === "PROVIDER";
  const data = {
    referrerId: referrer.id,
    referrerRole: referrer.role,
    referredUserId: newUserId,
    role,
    // A referring pro is paid in commission credit, a referring customer in booking credit.
    referrerRewardPKR: referrerIsPro && referredPro ? settings.referralProBonusPKR : settings.referralCustomerCreditPKR,
    refereeRewardPKR: referredPro ? 0 : settings.referralNewCustomerDiscountPKR,
    minJobPKR: referredPro ? 0 : settings.referralNewCustomerMinJobPKR,
    freeJobsGranted: referredPro ? settings.referralNewProFreeJobs : 0,
    jobsRequired: referredPro ? Math.max(1, settings.referralProJobsRequired) : 1,
    deviceId,
    phoneKey,
  };

  const reject = async (reason: string): Promise<AttachResult> => {
    await prisma.referral.create({ data: { ...data, freeJobsGranted: 0, status: "REJECTED", rejectReason: reason } });
    return { status: "rejected", reason };
  };

  // 1. Self-referral: same account, same phone number (any format), or the same device as the referrer.
  const phoneForms = new Set(phoneVariants(phone).map(digitsOnly));
  if (referrer.id === newUserId || phoneForms.has(digitsOnly(referrer.phone))) return reject("SELF_REFERRAL");
  if (deviceId && referrer.signupDeviceId === deviceId) return reject("SAME_DEVICE_AS_REFERRER");

  // 2. Repeat abuse: this phone number was already referred once (even if that account was deleted), or this
  //    device already created another account, or already appears on another referral.
  const priorPhone = await prisma.referral.findFirst({ where: { phoneKey: { in: Array.from(phoneForms) } }, select: { id: true } });
  if (priorPhone) return reject("PHONE_ALREADY_REFERRED");
  if (deviceId) {
    const otherAccount = await prisma.user.findFirst({ where: { signupDeviceId: deviceId, id: { not: newUserId } }, select: { id: true } });
    if (otherAccount) return reject("DEVICE_ALREADY_USED");
    const otherReferral = await prisma.referral.findFirst({ where: { deviceId }, select: { id: true } });
    if (otherReferral) return reject("DEVICE_ALREADY_USED");
  }

  // 3. A referrer cannot farm sign-ups: cap per rolling day.
  const recent = await prisma.referral.count({ where: { referrerId: referrer.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  if (recent >= MAX_REFERRALS_PER_DAY) return reject("RATE_LIMIT");

  await prisma.referral.create({ data: { ...data, status: "PENDING" } });

  // The new pro's 0% commission jobs start now (the counter is consumed when they win a job, see acceptBid).
  if (referredPro && data.freeJobsGranted > 0) {
    await prisma.providerProfile.update({ where: { userId: newUserId }, data: { commissionFreeJobsLeft: { increment: data.freeJobsGranted } } }).catch(() => {});
  }
  return { status: "applied" };
}

/**
 * Called when a booking reaches COMPLETED (the customer confirmed and, in this payment mode, paid).
 * Releases any referral reward that this completion earns. Safe to call repeatedly: each referral is
 * claimed with a conditional update, so a reward can never be paid twice.
 */
export async function onBookingCompleted(booking: { id: string; customerId: string; providerUserId: string; providerId: string }) {
  await Promise.allSettled([releaseCustomerReferral(booking), releaseProReferral(booking.providerUserId, booking.providerId)]);
}

async function claim(referralId: string) {
  const res = await prisma.referral.updateMany({ where: { id: referralId, status: "PENDING" }, data: { status: "RELEASED", releasedAt: new Date() } });
  return res.count === 1;
}

type ReferralRow = NonNullable<Awaited<ReturnType<typeof prisma.referral.findUnique>>>;

/** Pays the referrer: commission credit into a pro's wallet, or a booking credit for a customer. Never cash. */
async function rewardReferrer(referral: ReferralRow, reason: string) {
  const amount = referral.referrerRewardPKR;
  if (amount <= 0) return;

  if (referral.referrerRole === "PROVIDER") {
    const referrerProfile = await prisma.providerProfile.findUnique({ where: { userId: referral.referrerId }, select: { id: true } });
    if (!referrerProfile) return;
    const wallet = await prisma.proWallet.upsert({
      where: { providerId: referrerProfile.id },
      update: {},
      create: {
        providerId: referrerProfile.id,
        ceilingPKR: (await prisma.siteSettings.findUnique({ where: { id: "singleton" } }))?.defaultWalletCeilingPKR ?? 3000,
      },
    });
    await prisma.$transaction([
      prisma.proWallet.update({ where: { id: wallet.id }, data: { balancePKR: { increment: amount } } }),
      prisma.commissionLedgerEntry.create({ data: { walletId: wallet.id, type: "REFERRAL_BONUS", amountPKR: amount, memo: `Referral commission credit - ${reason}` } }),
    ]);
    // A marketing cost: it reduces what the pro owes Servigic, so book it against expenses.
    await postJournalEntry({
      memo: `Referral commission credit - referral ${referral.id.slice(0, 8)}`,
      source: "AUTO_REFERRAL_REWARD",
      referenceId: referral.id,
      lines: [
        { accountCode: "5000", debitPKR: amount },
        { accountCode: SYSTEM_ACCOUNTS.PRO_WALLET_RECEIVABLE, creditPKR: amount },
      ],
    }).catch((e) => console.error("[referral] journal entry failed", e));
    await notify({
      userId: referral.referrerId,
      type: "SYSTEM",
      title: "Referral reward earned!",
      body: `${reason}. PKR ${amount.toLocaleString()} commission credit was added - it reduces what you owe.`,
      linkUrl: "/pro/earnings",
    });
  } else {
    await prisma.rewardCredit.create({ data: { customerId: referral.referrerId, kind: "REFERRAL", amountPKR: amount } });
    await notify({
      userId: referral.referrerId,
      type: "SYSTEM",
      title: "Referral reward earned!",
      body: `${reason}. PKR ${amount.toLocaleString()} booking credit was added - it comes off your next job.`,
    });
  }
}

async function releaseCustomerReferral(booking: { id: string; customerId: string }) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: booking.customerId } });
  if (!referral || referral.status !== "PENDING" || referral.role !== "CUSTOMER") return;
  // The reward follows the specific job that got the new customer's discount.
  if (referral.discountBookingId !== booking.id) return;
  if (referral.referrerRole === "PROVIDER") {
    const hasProfile = await prisma.providerProfile.findUnique({ where: { userId: referral.referrerId }, select: { id: true } });
    if (!hasProfile) return;
  }
  if (!(await claim(referral.id))) return;
  await rewardReferrer(referral, "Your friend completed their first job");
}

async function releaseProReferral(proUserId: string, proProfileId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: proUserId } });
  if (!referral || referral.status !== "PENDING" || referral.role !== "PROVIDER") return;

  const profile = await prisma.providerProfile.findUnique({ where: { id: proProfileId }, select: { jobsCompleted: true } });
  if (!profile || profile.jobsCompleted < referral.jobsRequired) return;

  if (referral.referrerRole === "PROVIDER") {
    const hasProfile = await prisma.providerProfile.findUnique({ where: { userId: referral.referrerId }, select: { id: true } });
    if (!hasProfile) return;
  }
  if (!(await claim(referral.id))) return;
  await rewardReferrer(referral, `The pro you referred completed ${referral.jobsRequired} job${referral.jobsRequired === 1 ? "" : "s"}`);
}

/** Everything the apps show on the "Invite friends" card. */
export async function getReferralSummary(userId: string, role: Role) {
  const [code, settings, referrals, mine] = await Promise.all([
    ensureReferralCode(userId),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.referral.findMany({
      // Blocked sign-ups are not shown to the referrer (no hints about how the checks work).
      where: { referrerId: userId, status: { not: "REJECTED" } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // If this user themselves signed up with someone's code: what is waiting for them?
    prisma.referral.findUnique({ where: { referredUserId: userId } }),
  ]);
  const isPro = role === "PROVIDER";
  const names = await prisma.user.findMany({ where: { id: { in: referrals.map((r) => r.referredUserId) } }, select: { id: true, name: true } });
  const nameById = new Map(names.map((n) => [n.id, n.name]));

  // Earnings = what has actually been paid out to this user (their wallet view).
  let earnedPKR = 0;
  let availablePKR = 0;
  let entries: { id: string; amountPKR: number; createdAt: Date; used: boolean }[] = [];
  let freeJobsLeft = 0;
  if (isPro) {
    const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true, commissionFreeJobsLeft: true } });
    freeJobsLeft = profile?.commissionFreeJobsLeft ?? 0;
    const ledger = profile
      ? await prisma.commissionLedgerEntry.findMany({ where: { type: "REFERRAL_BONUS", wallet: { providerId: profile.id } }, orderBy: { createdAt: "desc" }, take: 50 })
      : [];
    earnedPKR = ledger.reduce((s, l) => s + l.amountPKR, 0);
    availablePKR = earnedPKR; // already inside the pro wallet balance
    entries = ledger.map((l) => ({ id: l.id, amountPKR: l.amountPKR, createdAt: l.createdAt, used: true }));
  } else {
    const credits = await prisma.rewardCredit.findMany({ where: { customerId: userId, kind: "REFERRAL" }, orderBy: { earnedAt: "desc" }, take: 50 });
    earnedPKR = credits.reduce((s, c) => s + c.amountPKR, 0);
    availablePKR = credits.filter((c) => !c.consumedAt).reduce((s, c) => s + c.amountPKR, 0);
    entries = credits.map((c) => ({ id: c.id, amountPKR: c.amountPKR, createdAt: c.earnedAt, used: Boolean(c.consumedAt) }));
  }

  return {
    code,
    enabled: Boolean(settings?.referralsEnabled),
    role: isPro ? "PROVIDER" : "CUSTOMER",
    // What an invite is worth, from this user's point of view.
    offer: {
      customerDiscountPKR: settings?.referralNewCustomerDiscountPKR ?? 0,
      customerMinJobPKR: settings?.referralNewCustomerMinJobPKR ?? 0,
      customerReferrerCreditPKR: settings?.referralCustomerCreditPKR ?? 0,
      proReferrerCreditPKR: isPro ? (settings?.referralProBonusPKR ?? 0) : (settings?.referralCustomerCreditPKR ?? 0),
      proJobsRequired: Math.max(1, settings?.referralProJobsRequired ?? 1),
      proFreeJobs: settings?.referralNewProFreeJobs ?? 0,
    },
    // This user's own welcome perk, if they joined with a code and it has not been used up yet.
    myWelcome:
      mine && mine.status === "PENDING"
        ? { discountPKR: mine.refereeRewardPKR, minJobPKR: mine.minJobPKR, freeJobsLeft: isPro ? freeJobsLeft : 0 }
        : null,
    earnedPKR,
    availablePKR,
    pendingCount: referrals.filter((r) => r.status === "PENDING").length,
    releasedCount: referrals.filter((r) => r.status === "RELEASED").length,
    entries,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: (nameById.get(r.referredUserId) ?? "Friend").split(" ")[0],
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}
