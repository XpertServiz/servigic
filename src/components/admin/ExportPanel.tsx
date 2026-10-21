"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Preset {
  id: string;
  name: string;
  filter: Record<string, string>;
}

// Export of the current filter (CSV or XLSX, with a column picker) and saved filter presets.
export function ExportPanel({
  resource,
  columns,
  filter,
  presets,
  basePath,
  canExport = true,
}: {
  resource: "leads" | "pros" | "waitlist";
  columns: { key: string; label: string; default: boolean }[];
  filter: Record<string, string>;
  presets: Preset[];
  basePath: string;
  canExport?: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(columns.filter((c) => c.default).map((c) => c.key));
  const [name, setName] = useState("");

  function download(format: "csv" | "xlsx") {
    const q = new URLSearchParams({ ...filter, resource, format, cols: picked.join(",") });
    window.location.href = `/api/admin/export?${q.toString()}`;
  }

  async function savePreset() {
    if (!name.trim()) return toast.error("Give the preset a name first.");
    const res = await fetch("/api/admin/saved-filters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, name, filter }) });
    if (!res.ok) return toast.error("Could not save the preset.");
    toast.success("Preset saved");
    setName("");
    router.refresh();
  }
  async function removePreset(id: string) {
    await fetch(`/api/admin/saved-filters?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mb-5 grid gap-3 rounded-[14px] border border-border-subtle p-4 md:grid-cols-2">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {canExport ? (
            <>
              <button type="button" onClick={() => download("xlsx")} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Export XLSX</button>
              <button type="button" onClick={() => download("csv")} className="rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent">Export CSV</button>
            </>
          ) : (
            <span className="rounded-full border border-border-subtle px-4 py-2 text-xs text-text-muted">Export is limited to super admins and growth admins</span>
          )}
          <span className="text-xs text-text-muted">Exports exactly the rows of the current filter{resource === "leads" ? " (do-not-contact leads are never included)" : ""}. Every export is logged.</span>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-text-muted">Choose columns ({picked.length})</summary>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {columns.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={picked.includes(c.key)} onChange={(e) => setPicked(e.target.checked ? [...picked, c.key] : picked.filter((k) => k !== c.key))} />
                {c.label}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div>
        <div className="mb-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Save this filter as…" className="w-56 rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm" />
          <button type="button" onClick={savePreset} className="rounded-full border border-border-subtle px-4 py-2 text-sm">Save preset</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.length === 0 && <span className="text-xs text-text-muted">No saved filters yet.</span>}
          {presets.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs">
              <a href={`${basePath}?${new URLSearchParams(p.filter).toString()}`} className="hover:text-accent">{p.name}</a>
              <button type="button" onClick={() => removePreset(p.id)} aria-label="Delete preset" className="text-text-muted hover:text-danger">✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
