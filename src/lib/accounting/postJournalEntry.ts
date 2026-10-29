import { prisma } from "@/lib/prisma";
import { getExchangeRates } from "@/lib/currency";
import { getTxCurrencyForCity } from "@/lib/txCurrency";
import type { Currency } from "@prisma/client";

export interface JournalLineInput {
  accountCode: string;
  debitPKR?: number;
  creditPKR?: number;
}

export interface PostJournalEntryInput {
  date?: Date;
  memo: string;
  source:
    | "AUTO_PAYMENT_VERIFIED"
    | "AUTO_PAYOUT_SENT"
    | "AUTO_DISPUTE_REFUND"
    | "AUTO_CHANGE_ORDER_PAYMENT_VERIFIED"
    | "AUTO_CASH_WALLET_COMMISSION_DEBIT"
    | "AUTO_TOPUP_VERIFIED"
    | "AUTO_REFERRAL_REWARD"
    | "AUTO_REFERRAL_DISCOUNT"
    | "MANUAL";
  referenceId?: string;
  createdById?: string;
  lines: JournalLineInput[];
}

export class UnbalancedJournalEntryError extends Error {
  constructor(totalDebit: number, totalCredit: number) {
    super(`Journal entry does not balance: debits=${totalDebit} credits=${totalCredit}`);
  }
}

// Every journal entry must balance (total debits === total credits) — this
// is the one invariant double-entry bookkeeping can never violate, so it's
// enforced here in code, not just left to whoever calls this function.
/** The currency the amounts of an automatic entry were really in: the market of the booking's city (or the pro's city for a top-up). */
async function currencyOfReference(referenceId?: string): Promise<Currency> {
  if (!referenceId) return "PKR";
  try {
    const booking = await prisma.booking.findUnique({ where: { id: referenceId }, select: { job: { select: { city: true } } } });
    if (booking) return (await getTxCurrencyForCity(booking.job.city)) as Currency;
    const topUp = await prisma.topUp.findUnique({ where: { id: referenceId }, select: { wallet: { select: { provider: { select: { user: { select: { city: true } } } } } } } });
    if (topUp) return (await getTxCurrencyForCity(topUp.wallet.provider.user.city)) as Currency;
  } catch {
    // unknown reference: the amounts are taken as PKR
  }
  return "PKR";
}

/** The journal is kept in PKR. An amount that came in another currency (a Saudi pro's commission in SAR, ...) is converted at the current
 *  rate, and the description says what it was: "SAR 15 = PKR 1,120 (rate 0.0134 SAR per PKR)". */
async function toPkr(input: PostJournalEntryInput): Promise<PostJournalEntryInput> {
  if (input.source === "MANUAL") return input;
  const currency = await currencyOfReference(input.referenceId);
  if (currency === "PKR") return input;
  const rate = (await getExchangeRates())[currency];
  if (!rate || rate <= 0) return input;
  const conv = (n?: number) => (n ? Math.round(n / rate) : n);
  const lines = input.lines.map((l) => ({ ...l, debitPKR: conv(l.debitPKR), creditPKR: conv(l.creditPKR) }));
  // Rounding must not unbalance the entry: the last credit absorbs a difference of a rupee or two.
  const d = lines.reduce((s, l) => s + (l.debitPKR ?? 0), 0);
  const c = lines.reduce((s, l) => s + (l.creditPKR ?? 0), 0);
  if (d !== c) {
    const last = [...lines].reverse().find((l) => (l.creditPKR ?? 0) > 0);
    if (last) last.creditPKR = (last.creditPKR ?? 0) + (d - c);
  }
  const original = input.lines.reduce((s, l) => s + (l.debitPKR ?? 0), 0);
  return { ...input, lines, memo: `${input.memo} [${currency} ${original.toLocaleString()} = PKR ${d.toLocaleString()}, rate ${rate} ${currency} per PKR]` };
}

export async function postJournalEntryInPkr(input: PostJournalEntryInput) {
  return postJournalEntry(await toPkr(input));
}

export async function postJournalEntry(input: PostJournalEntryInput) {
  const totalDebit = input.lines.reduce((sum, l) => sum + (l.debitPKR ?? 0), 0);
  const totalCredit = input.lines.reduce((sum, l) => sum + (l.creditPKR ?? 0), 0);
  if (totalDebit !== totalCredit || totalDebit === 0) {
    throw new UnbalancedJournalEntryError(totalDebit, totalCredit);
  }

  const accounts = await prisma.account.findMany({
    where: { code: { in: input.lines.map((l) => l.accountCode) } },
  });
  const accountByCode = new Map(accounts.map((a) => [a.code, a]));

  for (const line of input.lines) {
    if (!accountByCode.has(line.accountCode)) {
      throw new Error(`Unknown account code "${line.accountCode}" — check the Chart of Accounts`);
    }
  }

  return prisma.journalEntry.create({
    data: {
      date: input.date ?? new Date(),
      memo: input.memo,
      source: input.source,
      referenceId: input.referenceId,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((l) => ({
          accountId: accountByCode.get(l.accountCode)!.id,
          debitPKR: l.debitPKR ?? 0,
          creditPKR: l.creditPKR ?? 0,
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });
}

// Standard system account codes used by auto-posting — seeded by prisma/seed.ts.
export const SYSTEM_ACCOUNTS = {
  CASH: "1000",
  ESCROW_PAYABLE: "2000",
  COMMISSION_INCOME: "4000",
  PRO_WALLET_RECEIVABLE: "1100",
} as const;
