"use client";

import { useRouter } from "next/navigation";
import type { Account } from "@prisma/client";

interface LedgerRow {
  date: string;
  memo: string;
  source: string;
  debitPKR: number;
  creditPKR: number;
  runningBalance: number;
}

export function LedgerClient({
  accounts,
  selectedId,
  ledger,
}: {
  accounts: Account[];
  selectedId: string;
  ledger: { endingBalance: number; rows: LedgerRow[] } | null;
}) {
  const router = useRouter();

  return (
    <div>
      <select
        value={selectedId}
        onChange={(e) => router.push(`/admin/accounting/ledger?account=${e.target.value}`)}
        className="mb-6 w-full max-w-sm rounded-[8px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} · {a.name}
          </option>
        ))}
      </select>

      {ledger && (
        <>
          <div className="mb-4 rounded-[10px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
            <span className="font-bold text-accent">Ending balance: PKR {ledger.endingBalance.toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Memo</th>
                  <th className="p-4 text-right">Debit</th>
                  <th className="p-4 text-right">Credit</th>
                  <th className="p-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    <td className="p-4 text-text-muted">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="p-4">{r.memo}</td>
                    <td className="p-4 text-right text-accent">{r.debitPKR > 0 ? r.debitPKR.toLocaleString() : "—"}</td>
                    <td className="p-4 text-right text-secondary">{r.creditPKR > 0 ? r.creditPKR.toLocaleString() : "—"}</td>
                    <td className="p-4 text-right font-semibold">{r.runningBalance.toLocaleString()}</td>
                  </tr>
                ))}
                {ledger.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-text-muted">
                      No transactions posted to this account yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
