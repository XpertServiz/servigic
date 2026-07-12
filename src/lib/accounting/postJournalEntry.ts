import { prisma } from "@/lib/prisma";

export interface JournalLineInput {
  accountCode: string;
  debitPKR?: number;
  creditPKR?: number;
}

export interface PostJournalEntryInput {
  date?: Date;
  memo: string;
  source: "AUTO_PAYMENT_VERIFIED" | "AUTO_PAYOUT_SENT" | "AUTO_DISPUTE_REFUND" | "AUTO_CHANGE_ORDER_PAYMENT_VERIFIED" | "MANUAL";
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
} as const;
