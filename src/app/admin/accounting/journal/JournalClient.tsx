"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Account } from "@prisma/client";

interface LineView {
  accountCode: string;
  accountName: string;
  debitPKR: number;
  creditPKR: number;
}
interface EntryView {
  id: string;
  date: string;
  memo: string;
  source: string;
  createdByName: string | null;
  lines: LineView[];
}

type DraftLine = { accountCode: string; debit: string; credit: string };

const SOURCE_LABELS: Record<string, string> = {
  AUTO_PAYMENT_VERIFIED: "Auto · Payment Verified",
  AUTO_PAYOUT_SENT: "Auto · Payout Sent",
  AUTO_DISPUTE_REFUND: "Auto · Dispute Refund",
  AUTO_CHANGE_ORDER_PAYMENT_VERIFIED: "Auto · Change Order Payment",
  MANUAL: "Manual",
};

export function JournalClient({ entries, accounts }: { entries: EntryView[]; accounts: Account[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { accountCode: accounts[0]?.code ?? "", debit: "", credit: "" },
    { accountCode: accounts[1]?.code ?? "", debit: "", credit: "" },
  ]);
  const [pending, setPending] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((cur) => cur.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((cur) => [...cur, { accountCode: accounts[0]?.code ?? "", debit: "", credit: "" }]);
  }

  function removeLine(index: number) {
    setLines((cur) => cur.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!balanced || !memo.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/accounting/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memo: memo.trim(),
          lines: lines
            .filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0)
            .map((l) => ({ accountCode: l.accountCode, debitPKR: Number(l.debit) || 0, creditPKR: Number(l.credit) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to post entry");
        return;
      }
      toast.success("Journal entry posted");
      setShowForm(false);
      setMemo("");
      setLines([
        { accountCode: accounts[0]?.code ?? "", debit: "", credit: "" },
        { accountCode: accounts[1]?.code ?? "", debit: "", credit: "" },
      ]);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowForm((s) => !s)}
        className="mb-4 rounded-[10px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
      >
        {showForm ? "Cancel" : "+ New Manual Entry"}
      </button>

      {showForm && (
        <div className="mb-6 rounded-[12px] border border-border-subtle bg-bg-elevated p-5">
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Memo</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Owner capital injection"
            className="mb-4 w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />

          <div className="mb-2 grid grid-cols-[1fr_120px_120px_32px] gap-2 text-xs font-semibold text-text-muted">
            <span>Account</span>
            <span>Debit (PKR)</span>
            <span>Credit (PKR)</span>
            <span />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_120px_120px_32px] gap-2">
              <select
                value={line.accountCode}
                onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-2 py-2 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={line.debit}
                onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-2 py-2 text-sm"
              />
              <input
                type="number"
                value={line.credit}
                onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-2 py-2 text-sm"
              />
              <button onClick={() => removeLine(i)} disabled={lines.length <= 2} className="text-danger disabled:opacity-30">
                ✕
              </button>
            </div>
          ))}

          <button onClick={addLine} className="mb-4 text-xs font-semibold text-accent">
            + Add line
          </button>

          <div className="mb-4 flex items-center justify-between rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-4 py-2 text-sm">
            <span>
              Debit: <b>{totalDebit.toLocaleString()}</b> · Credit: <b>{totalCredit.toLocaleString()}</b>
            </span>
            <span className={balanced ? "font-bold text-secondary" : "font-bold text-danger"}>
              {balanced ? "Balanced ✓" : "Not balanced"}
            </span>
          </div>

          <button
            onClick={submit}
            disabled={!balanced || !memo.trim() || pending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post Entry"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-semibold">{entry.memo}</span>
                <span className="ml-2 text-xs text-text-muted">
                  {new Date(entry.date).toLocaleString()} · {SOURCE_LABELS[entry.source] ?? entry.source}
                  {entry.createdByName && ` · ${entry.createdByName}`}
                </span>
              </div>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {entry.lines.map((l, i) => (
                  <tr key={i} className="border-t border-border-subtle/50">
                    <td className="py-1.5 pr-4 text-text-muted">
                      {l.accountCode} · {l.accountName}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-accent">{l.debitPKR > 0 ? l.debitPKR.toLocaleString() : ""}</td>
                    <td className="py-1.5 text-right text-secondary">{l.creditPKR > 0 ? l.creditPKR.toLocaleString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No journal entries yet.
          </div>
        )}
      </div>
    </div>
  );
}
