import { prisma } from "@/lib/prisma";
import { getChartOfAccounts } from "@/lib/accounting/reports";
import { JournalClient } from "./JournalClient";

export default async function JournalPage() {
  const [entries, accounts] = await Promise.all([
    prisma.journalEntry.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: { lines: { include: { account: true } }, createdBy: { select: { name: true } } },
    }),
    getChartOfAccounts(),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">General Journal</h1>
      <p className="mb-8 text-text-muted">
        Every transaction, auto-posted (payments, payouts, refunds) or manually entered below. Debits must always
        equal credits.
      </p>
      <JournalClient
        entries={entries.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          memo: e.memo,
          source: e.source,
          createdByName: e.createdBy?.name ?? null,
          lines: e.lines.map((l) => ({
            accountCode: l.account.code,
            accountName: l.account.name,
            debitPKR: l.debitPKR,
            creditPKR: l.creditPKR,
          })),
        }))}
        accounts={accounts}
      />
    </div>
  );
}
