import { getChartOfAccounts, getLedger } from "@/lib/accounting/reports";
import { LedgerClient } from "./LedgerClient";

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account: accountId } = await searchParams;
  const accounts = await getChartOfAccounts();
  const selectedId = accountId ?? accounts[0]?.id ?? "";
  const ledger = selectedId ? await getLedger(selectedId) : null;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">General Ledger</h1>
      <p className="mb-8 text-text-muted">Pick an account to see every transaction posted to it, with a running balance.</p>
      <LedgerClient
        accounts={accounts}
        selectedId={selectedId}
        ledger={
          ledger
            ? {
                endingBalance: ledger.endingBalance,
                rows: ledger.rows.map((r) => ({
                  date: r.date.toISOString(),
                  memo: r.memo,
                  source: r.source,
                  debitPKR: r.debitPKR,
                  creditPKR: r.creditPKR,
                  runningBalance: r.runningBalance,
                })),
              }
            : null
        }
      />
    </div>
  );
}
