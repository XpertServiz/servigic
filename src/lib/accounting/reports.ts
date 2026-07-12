import { prisma } from "@/lib/prisma";
import type { AccountType } from "@prisma/client";
import { SYSTEM_ACCOUNTS } from "./postJournalEntry";

// Normal balance side per account type — determines whether debit or
// credit totals represent an *increase* for that account (standard
// double-entry bookkeeping rule, not a Servigic-specific choice).
const DEBIT_NORMAL: AccountType[] = ["ASSET", "EXPENSE"];

function netBalance(type: AccountType, debitPKR: number, creditPKR: number): number {
  return DEBIT_NORMAL.includes(type) ? debitPKR - creditPKR : creditPKR - debitPKR;
}

export async function getChartOfAccounts() {
  return prisma.account.findMany({ orderBy: { code: "asc" } });
}

export async function getTrialBalance(asOfDate?: Date) {
  const accounts = await prisma.account.findMany({
    orderBy: { code: "asc" },
    include: { lines: { where: asOfDate ? { entry: { date: { lte: asOfDate } } } : undefined } },
  });

  const rows = accounts.map((a) => {
    const debitPKR = a.lines.reduce((s, l) => s + l.debitPKR, 0);
    const creditPKR = a.lines.reduce((s, l) => s + l.creditPKR, 0);
    const balance = netBalance(a.type, debitPKR, creditPKR);
    return {
      code: a.code,
      name: a.name,
      type: a.type,
      debitColumn: DEBIT_NORMAL.includes(a.type) ? Math.max(0, balance) : Math.max(0, -balance),
      creditColumn: DEBIT_NORMAL.includes(a.type) ? Math.max(0, -balance) : Math.max(0, balance),
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debitColumn, 0);
  const totalCredit = rows.reduce((s, r) => s + r.creditColumn, 0);

  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

export async function getLedger(accountId: string, fromDate?: Date, toDate?: Date) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return null;

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      entry: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    },
    include: { entry: true },
    orderBy: { entry: { date: "asc" } },
  });

  let running = 0;
  const rows = lines.map((l) => {
    running += netBalance(account.type, l.debitPKR, l.creditPKR);
    return {
      date: l.entry.date,
      memo: l.entry.memo,
      source: l.entry.source,
      debitPKR: l.debitPKR,
      creditPKR: l.creditPKR,
      runningBalance: running,
    };
  });

  return { account, rows, endingBalance: running };
}

export async function getIncomeStatement(fromDate: Date, toDate: Date) {
  const accounts = await prisma.account.findMany({
    where: { type: { in: ["REVENUE", "EXPENSE"] } },
    orderBy: { code: "asc" },
    include: { lines: { where: { entry: { date: { gte: fromDate, lte: toDate } } } } },
  });

  const revenue = accounts
    .filter((a) => a.type === "REVENUE")
    .map((a) => ({
      code: a.code,
      name: a.name,
      amountPKR: netBalance(a.type, a.lines.reduce((s, l) => s + l.debitPKR, 0), a.lines.reduce((s, l) => s + l.creditPKR, 0)),
    }));
  const expenses = accounts
    .filter((a) => a.type === "EXPENSE")
    .map((a) => ({
      code: a.code,
      name: a.name,
      amountPKR: netBalance(a.type, a.lines.reduce((s, l) => s + l.debitPKR, 0), a.lines.reduce((s, l) => s + l.creditPKR, 0)),
    }));

  const totalRevenue = revenue.reduce((s, r) => s + r.amountPKR, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amountPKR, 0);

  return { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
}

export async function getBalanceSheet(asOfDate: Date) {
  const accounts = await prisma.account.findMany({
    where: { type: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
    orderBy: { code: "asc" },
    include: { lines: { where: { entry: { date: { lte: asOfDate } } } } },
  });

  function summarize(type: AccountType) {
    return accounts
      .filter((a) => a.type === type)
      .map((a) => ({
        code: a.code,
        name: a.name,
        amountPKR: netBalance(a.type, a.lines.reduce((s, l) => s + l.debitPKR, 0), a.lines.reduce((s, l) => s + l.creditPKR, 0)),
      }));
  }

  const assets = summarize("ASSET");
  const liabilities = summarize("LIABILITY");
  const equity = summarize("EQUITY");

  // Retained earnings = cumulative net income since inception, as of this date —
  // the plug that makes Assets = Liabilities + Equity balance, same as any
  // real set of books that doesn't close income into equity every period.
  const inceptionStatement = await getIncomeStatement(new Date(0), asOfDate);
  const retainedEarnings = inceptionStatement.netIncome;

  const totalAssets = assets.reduce((s, a) => s + a.amountPKR, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.amountPKR, 0);
  const totalEquity = equity.reduce((s, a) => s + a.amountPKR, 0) + retainedEarnings;

  return {
    assets,
    liabilities,
    equity,
    retainedEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: totalAssets === totalLiabilities + totalEquity,
  };
}

export async function getCashFlow(fromDate: Date, toDate: Date) {
  const cashAccount = await prisma.account.findUnique({ where: { code: SYSTEM_ACCOUNTS.CASH } });
  if (!cashAccount) return null;

  const [beforeLines, periodLines] = await Promise.all([
    prisma.journalLine.findMany({ where: { accountId: cashAccount.id, entry: { date: { lt: fromDate } } } }),
    prisma.journalLine.findMany({
      where: { accountId: cashAccount.id, entry: { date: { gte: fromDate, lte: toDate } } },
      include: { entry: true },
      orderBy: { entry: { date: "asc" } },
    }),
  ]);

  const beginningBalance = beforeLines.reduce((s, l) => s + (l.debitPKR - l.creditPKR), 0);

  let running = beginningBalance;
  const rows = periodLines.map((l) => {
    const change = l.debitPKR - l.creditPKR;
    running += change;
    return { date: l.entry.date, memo: l.entry.memo, source: l.entry.source, changePKR: change, runningBalance: running };
  });

  const netChange = rows.reduce((s, r) => s + r.changePKR, 0);

  return { beginningBalance, endingBalance: beginningBalance + netChange, netChange, rows };
}
