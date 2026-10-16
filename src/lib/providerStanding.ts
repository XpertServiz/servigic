import { prisma } from "@/lib/prisma";
import type { WalletDispatchStatus } from "@prisma/client";
import { notify } from "@/lib/notify";

const SEVERITY_RANK: Record<WalletDispatchStatus, number> = { NORMAL: 0, WARNED: 1, THROTTLED: 2, SUSPENDED: 3 };

// Single source of truth for a pro's dispatch eligibility (v6 §1.4 wallet
// enforcement + v7 §2.3 cancellation-rate enforcement) — src/lib/dispatch.ts
// and the bid-creation route only ever check ProviderProfile.dispatchStatus,
// never wallet/cancellation fields directly. Call after any event that could
// change either input: booking completion, top-up verification, cancellation.
export async function recomputeProviderStanding(providerId: string): Promise<void> {
  const profile = await prisma.providerProfile.findUnique({ where: { id: providerId } });
  if (!profile) return;

  // Admin-issued suspensions/delistings (v7 §2.4 /admin/flags) are sticky —
  // only an explicit admin action clears them, never this automatic recompute.
  if (profile.dispatchStatus === "SUSPENDED" && profile.dispatchBlockedReason === "ADMIN_FLAG") return;

  const wallet = await prisma.proWallet.findUnique({ where: { providerId } });
  const debtPKR = wallet ? Math.max(0, -wallet.balancePKR) : 0;
  const walletSeverity: WalletDispatchStatus = !wallet
    ? "NORMAL"
    : debtPKR >= wallet.ceilingPKR || wallet.unsettledJobCount >= 3
      ? "SUSPENDED"
      : debtPKR >= wallet.ceilingPKR * 0.8
        ? "WARNED"
        : "NORMAL";

  const now = new Date();
  const cancelled7d = await prisma.cancellationEvent.count({
    where: {
      cancelledById: profile.userId,
      cancelledByRole: "PROVIDER",
      createdAt: { gte: new Date(now.getTime() - 7 * 24 * 3600_000) },
    },
  });

  // A fresh >20% breach opens a 48h SUSPENDED window (the ride-hailing-style
  // time penalty). Once it lapses we don't immediately re-suspend just
  // because the 30-day rate hasn't rolled off yet — we fall back to
  // THROTTLED instead, so a pro isn't locked out indefinitely by one bad week.
  const alreadyCancellationSuspended =
    profile.dispatchStatus === "SUSPENDED" &&
    profile.dispatchBlockedReason === "CANCELLATION_RATE" &&
    profile.suspendedUntil !== null &&
    profile.suspendedUntil > now;

  let cancellationSeverity: WalletDispatchStatus;
  if (alreadyCancellationSuspended) {
    cancellationSeverity = "SUSPENDED";
  } else if (profile.cancellationRate30d > 0.2) {
    cancellationSeverity = "SUSPENDED";
  } else if (profile.cancellationRate30d > 0.15) {
    cancellationSeverity = "THROTTLED";
  } else if (profile.cancellationRate30d > 0.1 || cancelled7d >= 3) {
    cancellationSeverity = "WARNED";
  } else {
    cancellationSeverity = "NORMAL";
  }

  const walletWins = SEVERITY_RANK[walletSeverity] >= SEVERITY_RANK[cancellationSeverity];
  const finalStatus = walletWins ? walletSeverity : cancellationSeverity;
  const reason: string | null =
    finalStatus === "NORMAL"
      ? null
      : walletWins
        ? wallet && wallet.unsettledJobCount >= 3
          ? "WALLET_UNSETTLED_JOBS"
          : "WALLET_CEILING"
        : "CANCELLATION_RATE";

  const isNewCancellationSuspension = !walletWins && finalStatus === "SUSPENDED" && !alreadyCancellationSuspended;
  const previousStatus = profile.dispatchStatus;

  await prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      dispatchStatus: finalStatus,
      dispatchBlockedReason: reason,
      suspendedUntil: isNewCancellationSuspension
        ? new Date(now.getTime() + 48 * 3600_000)
        : walletWins
          ? null
          : profile.suspendedUntil,
    },
  });

  // Tell the pro WHEN their standing changes (not on every recompute), what they owe, and how to fix it - so they
  // never find out only when a bid fails.
  if (previousStatus !== finalStatus && wallet) {
    const owe = `PKR ${debtPKR.toLocaleString()}`;
    if (finalStatus === "SUSPENDED" && walletWins) {
      await notify({
        userId: profile.userId,
        type: "SYSTEM",
        title: "Top up your wallet to keep getting jobs",
        body:
          wallet.unsettledJobCount >= 3 && debtPKR < wallet.ceilingPKR
            ? `You have ${wallet.unsettledJobCount} completed jobs with commission not paid yet (${owe}). New job alerts and bidding are paused until you top up. Open Earnings > Top up, pay, and upload the payment screenshot with its transaction ID.`
            : `You owe ${owe} in commission, which is over your limit of PKR ${wallet.ceilingPKR.toLocaleString()}. New job alerts and bidding are paused until you top up. Open Earnings > Top up, pay, and upload the payment screenshot with its transaction ID.`,
        linkUrl: "/pro/earnings",
      }).catch(() => {});
    } else if (finalStatus === "WARNED" && walletWins) {
      await notify({
        userId: profile.userId,
        type: "SYSTEM",
        title: "Your wallet balance is almost at the limit",
        body: `You owe ${owe} (limit PKR ${wallet.ceilingPKR.toLocaleString()}). Top up soon so you do not miss jobs.`,
        linkUrl: "/pro/earnings",
      }).catch(() => {});
    } else if (finalStatus === "NORMAL" && (previousStatus === "SUSPENDED" || previousStatus === "WARNED")) {
      await notify({
        userId: profile.userId,
        type: "SYSTEM",
        title: "You are all set",
        body: "Your wallet is settled. You will get job alerts and can bid again.",
        linkUrl: "/pro/earnings",
      }).catch(() => {});
    }
  }
}
