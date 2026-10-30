import type { Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Per-trade approval. ProviderProfile.trades holds only the APPROVED trades (dispatch, the job feed and bidding
// all read that array, so a pro only ever receives alerts for approved trades). Every trade a pro asks for is a
// ProviderTrade row that stays PENDING until an admin approves it individually. The very first set of trades a
// pro picks while still unverified is approved together with their documents (see approveInitialTrades).

export type TradeSelectionResult = { ok: true; pending: Trade[] } | { ok: false; error: string; code: string };

export async function requestTradeSelection(profileId: string, desired: Trade[], maxTrades: number): Promise<TradeSelectionResult> {
  const unique = Array.from(new Set(desired));
  if (unique.length > maxTrades) {
    return { ok: false, code: "TOO_MANY_TRADES", error: `You can work in up to ${maxTrades} trade${maxTrades === 1 ? "" : "s"}.` };
  }

  const profile = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { trades: true } });
  if (!profile) return { ok: false, code: "NO_PROFILE", error: "Profile not found" };
  const rows = await prisma.providerTrade.findMany({ where: { providerId: profileId } });
  const approved = new Set<Trade>(profile.trades);

  const removed = Array.from(approved).filter((t) => !unique.includes(t));
  const stalePending = rows.filter((r) => r.status !== "APPROVED" && !unique.includes(r.trade)).map((r) => r.trade);
  const toRequest = unique.filter((t) => !approved.has(t));

  await prisma.$transaction([
    ...(removed.length || stalePending.length
      ? [prisma.providerTrade.deleteMany({ where: { providerId: profileId, trade: { in: [...removed, ...stalePending] } } })]
      : []),
    ...(removed.length ? [prisma.providerProfile.update({ where: { id: profileId }, data: { trades: profile.trades.filter((t) => !removed.includes(t)) } })] : []),
    ...toRequest.map((trade) => {
      const existing = rows.find((r) => r.trade === trade);
      // Already waiting: leave it (keeps any certificate they uploaded). Rejected earlier: ask again from scratch.
      if (existing?.status === "PENDING") return prisma.providerTrade.update({ where: { id: existing.id }, data: {} });
      return prisma.providerTrade.upsert({
        where: { providerId_trade: { providerId: profileId, trade } },
        create: { providerId: profileId, trade, status: "PENDING" },
        update: { status: "PENDING", adminNote: null, reviewedAt: null },
      });
    }),
  ]);
  return { ok: true, pending: toRequest };
}

/** On document approval: the trades the pro signed up with (waiting, no certificate asked) are approved too, so he need not pick them again. */
export async function approveInitialTrades(profileId: string): Promise<number> {
  const profile = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { trades: true } });
  if (!profile) return 0;
  const pending = await prisma.providerTrade.findMany({ where: { providerId: profileId, status: "PENDING", certificateRequested: false } });
  if (pending.length === 0) return 0;
  await prisma.$transaction([
    prisma.providerTrade.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: "APPROVED", reviewedAt: new Date() } }),
    prisma.providerProfile.update({ where: { id: profileId }, data: { trades: Array.from(new Set([...profile.trades, ...pending.map((p) => p.trade)])) } }),
  ]);
  return pending.length;
}

export async function listTradeRequests(profileId: string) {
  const rows = await prisma.providerTrade.findMany({ where: { providerId: profileId }, orderBy: { requestedAt: "asc" } });
  return rows.map((r) => ({
    trade: r.trade,
    status: r.status,
    certificateRequested: r.certificateRequested,
    certificateUploaded: Boolean(r.certificateUrl),
    adminNote: r.adminNote,
  }));
}
