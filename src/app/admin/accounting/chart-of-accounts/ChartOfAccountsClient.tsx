"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Account, AccountType } from "@prisma/client";

const TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const TYPE_COLORS: Record<AccountType, string> = {
  ASSET: "text-accent border-accent/30 bg-accent/10",
  LIABILITY: "text-danger border-danger/30 bg-danger/10",
  EQUITY: "text-secondary border-secondary/30 bg-secondary/10",
  REVENUE: "text-secondary border-secondary/30 bg-secondary/10",
  EXPENSE: "text-danger border-danger/30 bg-danger/10",
};

export function ChartOfAccountsClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("EXPENSE");
  const [pending, setPending] = useState(false);

  async function create() {
    if (!code.trim() || !name.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), name: name.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create account");
        return;
      }
      toast.success("Account added");
      setShowForm(false);
      setCode("");
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/accounting/accounts/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Failed to delete");
      return;
    }
    toast.success("Account deleted");
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => setShowForm((s) => !s)}
        className="mb-4 rounded-[10px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
      >
        {showForm ? "Cancel" : "+ Add Account"}
      </button>

      {showForm && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="5100"
              className="w-24 rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WhatsApp API Fees"
              className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={create}
            disabled={pending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            Add
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Name</th>
              <th className="p-4">Type</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-border-subtle">
                <td className="p-4 font-mono">{a.code}</td>
                <td className="p-4 font-semibold">
                  {a.isSystem && "🔒 "}
                  {a.name}
                </td>
                <td className="p-4">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                </td>
                <td className="p-4 text-right">
                  {!a.isSystem && (
                    <button onClick={() => remove(a.id)} className="text-xs font-semibold text-danger">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
