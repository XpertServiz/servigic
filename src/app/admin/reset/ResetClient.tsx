"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Part = { key: string; label: string; defaultOn: boolean };

/** Choose what to wipe, preview the exact numbers (dry run), type WIPE, and wipe. */
export function ResetClient({ parts }: { parts: Part[] }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [chosen, setChosen] = useState<Record<string, boolean>>(Object.fromEntries(parts.map((p) => [p.key, p.defaultOn])));
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"" | "preview" | "wipe">("");

  useEffect(() => {
    fetch("/api/admin/wipe")
      .then((r) => r.json())
      .then((d) => setCounts(d.preview ?? null))
      .catch(() => {});
  }, []);

  const selected = parts.filter((p) => chosen[p.key]).map((p) => p.key);

  async function call(dryRun: boolean) {
    setBusy(dryRun ? "preview" : "wipe");
    try {
      const res = await fetch("/api/admin/wipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parts: selected, dryRun, confirm }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setPreview(d.counts ?? {});
      if (!dryRun) {
        toast.success("Test data wiped. Servigic is ready for a clean start.");
        setConfirm("");
        const fresh = await fetch("/api/admin/wipe").then((r) => r.json());
        setCounts(fresh.preview ?? null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  const total = preview ? Object.values(preview).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
        <h2 className="mb-3 font-bold">1. Choose what to wipe</h2>
        <div className="flex flex-col gap-3">
          {parts.map((p) => (
            <label key={p.key} className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={Boolean(chosen[p.key])} onChange={(e) => setChosen({ ...chosen, [p.key]: e.target.checked })} />
              <span>
                {p.label}
                <span className="ms-2 rounded-full border border-border-subtle px-2 py-0.5 text-xs text-text-muted">{counts ? `${counts[p.key] ?? 0} now` : "…"}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-muted">Always kept: admin accounts, settings, markets and countries, categories and trades, cities, areas and zones, exchange rates, the chart of accounts.</p>
      </div>

      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
        <h2 className="mb-3 font-bold">2. Preview the exact numbers (nothing is deleted)</h2>
        <button type="button" disabled={!selected.length || busy !== ""} onClick={() => call(true)} className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50">
          {busy === "preview" ? "Counting…" : "Preview"}
        </button>
        {preview && (
          <div className="mt-4 text-sm">
            <div className="mb-2 font-semibold">{total.toLocaleString()} rows affected:</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-text-muted sm:grid-cols-3">
              {Object.entries(preview)
                .sort((a, b) => b[1] - a[1])
                .map(([table, n]) => (
                  <div key={table}>
                    {table}: <b className="text-text">{n}</b>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-danger/50 bg-danger/5 p-5">
        <h2 className="mb-2 font-bold text-danger">3. Wipe permanently</h2>
        <p className="mb-3 text-sm text-text-muted">This cannot be undone. Type WIPE to confirm.</p>
        <div className="flex flex-wrap gap-3">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="WIPE" className="w-40 rounded-[10px] border border-border-subtle bg-bg px-4 py-2 font-mono outline-none focus:border-danger" />
          <button type="button" disabled={confirm !== "WIPE" || !selected.length || busy !== ""} onClick={() => call(false)} className="rounded-full bg-danger px-5 py-2 text-sm font-bold text-white disabled:opacity-40">
            {busy === "wipe" ? "Wiping… (can take a minute)" : "Wipe now"}
          </button>
        </div>
      </div>
    </div>
  );
}
