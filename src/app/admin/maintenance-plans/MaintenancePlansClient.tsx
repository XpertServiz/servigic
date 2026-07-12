"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PlanRow {
  id: string;
  categoryName: string;
  categoryIcon: string;
  customerName: string;
  customerPhone: string;
  frequency: string;
  status: string;
  nextDueDate: string;
}

export function MaintenancePlansClient({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function runSweep() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/maintenance-plans/run-sweep", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`Sweep complete — ${data.count} job(s) created`);
      router.refresh();
    } catch {
      toast.error("Sweep failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={runSweep}
        disabled={pending}
        className="mb-6 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Running…" : "Run Sweep Now"}
      </button>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Category</th>
              <th className="p-4">Frequency</th>
              <th className="p-4">Next Due</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-border-subtle">
                <td className="p-4">
                  {p.customerName}
                  <div className="text-xs text-text-muted">{p.customerPhone}</div>
                </td>
                <td className="p-4">
                  {p.categoryIcon} {p.categoryName}
                </td>
                <td className="p-4 text-text-muted">{p.frequency.toLowerCase()}</td>
                <td className="p-4 text-text-muted">{new Date(p.nextDueDate).toLocaleDateString()}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                      p.status === "ACTIVE" ? "border-secondary/40 text-secondary" : "border-border-subtle text-text-muted"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-text-muted">
                  No maintenance plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
