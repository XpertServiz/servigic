"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BenchmarkRow {
  id: string;
  categoryName: string;
  categoryIcon: string;
  subServiceName: string | null;
  city: string;
  windowDays: number;
  sampleSize: number;
  avgWinningPKR: number;
  medianWinningPKR: number;
  minPKR: number;
  maxPKR: number;
  updatedAt: string;
}

export function PriceBenchmarksClient({ benchmarks }: { benchmarks: BenchmarkRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function recompute() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/price-benchmarks/recompute", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`Recomputed — ${data.count} benchmark rows now live`);
      router.refresh();
    } catch {
      toast.error("Failed to recompute");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={recompute}
        disabled={pending}
        className="mb-6 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Recomputing…" : "Recompute Now"}
      </button>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Category</th>
              <th className="p-4">City</th>
              <th className="p-4">Window</th>
              <th className="p-4 text-right">Sample</th>
              <th className="p-4 text-right">Avg</th>
              <th className="p-4 text-right">Median</th>
              <th className="p-4 text-right">Range</th>
              <th className="p-4">Updated</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b) => (
              <tr key={b.id} className="border-t border-border-subtle">
                <td className="p-4">
                  {b.categoryIcon} {b.categoryName}
                  {b.subServiceName && <span className="text-text-muted"> · {b.subServiceName}</span>}
                </td>
                <td className="p-4 text-text-muted">{b.city}</td>
                <td className="p-4 text-text-muted">{b.windowDays}d</td>
                <td className="p-4 text-right">{b.sampleSize}</td>
                <td className="p-4 text-right text-accent">PKR {b.avgWinningPKR.toLocaleString()}</td>
                <td className="p-4 text-right">PKR {b.medianWinningPKR.toLocaleString()}</td>
                <td className="p-4 text-right text-text-muted">
                  {b.minPKR.toLocaleString()}–{b.maxPKR.toLocaleString()}
                </td>
                <td className="p-4 text-text-muted">{new Date(b.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {benchmarks.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-text-muted">
                  No benchmarks yet — need at least 5 completed jobs in a category/city before one appears.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
