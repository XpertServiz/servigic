"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { IMPORT_FIELDS, type ColumnMapping, type ImportReport } from "@/lib/leadImportShared";

const box = "rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent";

interface Parsed {
  headers: string[];
  sample: string[][];
  total: number;
  guess: ColumnMapping;
  templates: { name: string; mapping: ColumnMapping }[];
}

// Step 1 upload -> step 2 map columns -> step 3 preview (writes nothing) -> step 4 import -> report.
export function ImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [sourceName, setSourceName] = useState("");
  const [country, setCountry] = useState("PK");
  const [city, setCity] = useState("Karachi");
  const [geocode, setGeocode] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(step: "parse" | "preview" | "import") {
    if (!file) return null;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("step", step);
    fd.set("mapping", JSON.stringify(mapping));
    fd.set("sourceName", sourceName || file.name);
    fd.set("country", country);
    fd.set("city", city);
    fd.set("geocode", geocode ? "1" : "0");
    fd.set("saveTemplate", saveTemplate);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pro-leads/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function onFile(f: File | null) {
    setFile(f);
    setParsed(null);
    setReport(null);
    if (!f) return;
    setSourceName(f.name);
    const fd = new FormData();
    fd.set("file", f);
    fd.set("step", "parse");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pro-leads/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Could not read the file");
      setParsed(data);
      setMapping(data.guess);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-border-subtle p-4">
        <h2 className="mb-2 font-bold">1. Choose the file</h2>
        <input type="file" accept=".csv,.xlsx" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-sm" />
        {parsed && <p className="mt-2 text-sm text-text-muted">{parsed.total} data rows, {parsed.headers.length} columns.</p>}
      </div>

      {parsed && (
        <>
          <div className="rounded-[14px] border border-border-subtle p-4">
            <h2 className="mb-2 font-bold">2. Which column is which?</h2>
            {parsed.templates.length > 0 && (
              <label className="mb-3 block text-xs text-text-muted">
                Use a saved mapping
                <select className={`${box} ms-2`} onChange={(e) => { const t = parsed.templates.find((x) => x.name === e.target.value); if (t) setMapping(t.mapping); }}>
                  <option value="">(pick)</option>
                  {parsed.templates.map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((fl) => (
                <label key={fl.key} className="text-xs text-text-muted">
                  <span className="mb-1 block">{fl.label}</span>
                  <select
                    value={mapping[fl.key] ?? ""}
                    onChange={(e) => {
                      const next = { ...mapping };
                      if (e.target.value === "") delete next[fl.key];
                      else next[fl.key] = Number(e.target.value);
                      setMapping(next);
                    }}
                    className={`${box} w-full`}
                  >
                    <option value="">(not in the file)</option>
                    {parsed.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-[10px] border border-border-subtle text-xs">
              <table className="w-full">
                <thead className="bg-bg-elevated text-text-muted"><tr>{parsed.headers.map((h, i) => <th key={i} className="p-2 text-start">{h}</th>)}</tr></thead>
                <tbody>{parsed.sample.map((r, i) => <tr key={i} className="border-t border-border-subtle">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[14px] border border-border-subtle p-4">
            <h2 className="mb-2 font-bold">3. Details, then preview</h2>
            <div className="flex flex-wrap items-end gap-3 text-xs text-text-muted">
              <label>Source name<input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={`${box} mt-1 block w-56`} /></label>
              <label>Default country<input value={country} maxLength={2} onChange={(e) => setCountry(e.target.value.toUpperCase())} className={`${box} mt-1 block w-20`} /></label>
              <label>Default city (when the file has none)<input value={city} onChange={(e) => setCity(e.target.value)} className={`${box} mt-1 block w-40`} /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={geocode} onChange={(e) => setGeocode(e.target.checked)} />Look up map positions from addresses (Google, needs the API key)</label>
              <label>Save this mapping as<input value={saveTemplate} onChange={(e) => setSaveTemplate(e.target.value)} placeholder="e.g. OLX export" className={`${box} mt-1 block w-44`} /></label>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" disabled={busy || mapping.phone == null} onClick={async () => { const d = await call("preview"); if (d) setReport(d.report); }} className="rounded-full border border-accent/50 px-5 py-2 text-sm font-semibold text-accent disabled:opacity-50">Preview (writes nothing)</button>
              <button
                type="button"
                disabled={busy || mapping.phone == null || !report}
                onClick={async () => {
                  const d = await call("import");
                  if (d) {
                    setReport(d.report);
                    toast.success(`Imported: ${d.report.added} added, ${d.report.updated} updated`);
                  }
                }}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                Import now
              </button>
            </div>
            {mapping.phone == null && <p className="mt-2 text-xs text-danger">Choose the phone column first.</p>}
          </div>
        </>
      )}

      {report && (
        <div className="rounded-[14px] border border-border-subtle p-4">
          <h2 className="mb-3 font-bold">{report.committed ? "Import report" : "Preview"}</h2>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            {[["Rows", report.total], [report.committed ? "Added" : "Will add", report.added], [report.committed ? "Updated" : "Will update", report.updated], ["Duplicates in file", report.duplicatesInFile], ["Invalid phones", report.invalid.length]].map(([l, v]) => (
              <div key={l as string} className="rounded-[10px] border border-border-subtle bg-bg-elevated p-3"><div className="text-[11px] uppercase text-text-muted">{l}</div><div className="text-xl font-bold">{v}</div></div>
            ))}
          </div>
          {report.geocoded > 0 && <p className="mb-3 text-xs text-text-muted">{report.geocoded} addresses were given a map position.</p>}
          {report.invalid.length > 0 && (
            <details className="mb-3 text-sm"><summary className="cursor-pointer text-danger">Invalid phone numbers ({report.invalid.length})</summary>
              <ul className="mt-2 text-xs text-text-muted">{report.invalid.slice(0, 100).map((x) => <li key={x.rowNo}>Row {x.rowNo}: “{x.value}” ({x.why})</li>)}</ul></details>
          )}
          {report.unmatchedAreas.length > 0 && (
            <details open className="mb-3 text-sm"><summary className="cursor-pointer text-accent">Areas not recognised ({report.unmatchedAreas.length})</summary>
              <ul className="mt-2 text-xs text-text-muted">{report.unmatchedAreas.map((x) => <li key={x.text}>“{x.text}” × {x.count}</li>)}</ul>
              <p className="mt-2 text-xs">Assign them once in <Link href="/admin/areas" className="text-accent underline">Areas → Unmatched</Link>; the text becomes an alias and every lead is re-checked.</p></details>
          )}
          <div className="overflow-x-auto rounded-[10px] border border-border-subtle text-xs">
            <table className="w-full"><thead className="bg-bg-elevated text-text-muted"><tr><th className="p-2 text-start">Row</th><th className="p-2 text-start">Name</th><th className="p-2 text-start">Phone</th><th className="p-2 text-start">Trades</th><th className="p-2 text-start">Area</th><th className="p-2 text-start">Result</th></tr></thead>
              <tbody>{report.sample.map((s) => <tr key={s.rowNo} className="border-t border-border-subtle"><td className="p-2">{s.rowNo}</td><td className="p-2">{s.name}</td><td className="p-2" dir="ltr">{s.phone}</td><td className="p-2">{s.trades.join(", ") || "—"}</td><td className="p-2">{s.area ?? "—"}</td><td className="p-2">{s.action}</td></tr>)}</tbody></table>
          </div>
          {report.committed && <Link href="/admin/pro-leads" className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">Go to Pro Leads</Link>}
        </div>
      )}
    </div>
  );
}
