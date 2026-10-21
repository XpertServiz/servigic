"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const box = "rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent";

interface AreaView {
  id: string;
  cityId: string;
  cityName: string;
  countryCode: string;
  name: string;
  aliases: string[];
  lat: number | null;
  lng: number | null;
  leads: number;
}

export function AreasClient({ cities, areas, unmatched }: { cities: { id: string; name: string; countryCode: string }[]; areas: AreaView[]; unmatched: { text: string; count: number; from: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", aliases: "", lat: "", lng: "" });
  const [add, setAdd] = useState({ cityId: cities[0]?.id ?? "", name: "", aliases: "", lat: "", lng: "" });
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");

  async function post(body: unknown, ok: string) {
    const res = await fetch("/api/admin/areas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Could not save");
      return false;
    }
    toast.success(data.rematched ? `${ok} · ${data.rematched} leads matched` : ok);
    router.refresh();
    return true;
  }

  const toAliases = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const numOrNull = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));
  const shown = areas.filter((a) => !filter || `${a.name} ${a.cityName} ${a.aliases.join(" ")}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => post({ action: "seed" }, "Starter areas loaded")} className="rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent">Load / refresh starter areas</button>
        <span className="text-xs text-text-muted">Adds Karachi, Lahore, Islamabad/Rawalpindi, Riyadh, Jeddah, Dubai and Toronto. Never removes or overwrites your edits.</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search areas / aliases" className={`${box} ms-auto w-56`} />
      </div>

      {unmatched.length > 0 && (
        <div className="rounded-[14px] border border-accent/40 bg-accent/5 p-4">
          <h2 className="mb-2 font-bold">Unmatched areas ({unmatched.length})</h2>
          <p className="mb-3 text-xs text-text-muted">Texts nobody could match. Pick the right area once: the text is saved as an alias and every lead is checked again.</p>
          <div className="flex flex-col gap-2">
            {unmatched.map((u) => (
              <div key={u.text} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-[10rem] font-semibold">{u.text}</span>
                <span className="text-xs text-text-muted">× {u.count} · {u.from}</span>
                <select value={assign[u.text] ?? ""} onChange={(e) => setAssign({ ...assign, [u.text]: e.target.value })} className={`${box} w-56`}>
                  <option value="">Assign to…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.cityName})</option>
                  ))}
                </select>
                <button type="button" disabled={!assign[u.text]} onClick={() => post({ action: "assign", text: u.text, areaId: assign[u.text], saveAlias: true }, "Saved as an alias")} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-40">Assign + save alias</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[14px] border border-border-subtle p-4">
        <h2 className="mb-2 font-bold">Add an area</h2>
        <div className="flex flex-wrap items-end gap-3 text-xs text-text-muted">
          <label>City<select value={add.cityId} onChange={(e) => setAdd({ ...add, cityId: e.target.value })} className={`${box} mt-1 block`}>{cities.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.countryCode})</option>)}</select></label>
          <label>Name<input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} className={`${box} mt-1 block w-44`} /></label>
          <label>Aliases (comma separated)<input value={add.aliases} onChange={(e) => setAdd({ ...add, aliases: e.target.value })} className={`${box} mt-1 block w-64`} /></label>
          <label>Lat<input value={add.lat} onChange={(e) => setAdd({ ...add, lat: e.target.value })} className={`${box} mt-1 block w-24`} /></label>
          <label>Lng<input value={add.lng} onChange={(e) => setAdd({ ...add, lng: e.target.value })} className={`${box} mt-1 block w-24`} /></label>
          <button type="button" onClick={async () => { if (await post({ cityId: add.cityId, name: add.name, aliases: toAliases(add.aliases), lat: numOrNull(add.lat), lng: numOrNull(add.lng) }, "Area added")) setAdd({ ...add, name: "", aliases: "", lat: "", lng: "" }); }} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">Add</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr><th className="p-3">City</th><th className="p-3">Area</th><th className="p-3">Aliases</th><th className="p-3">Centre</th><th className="p-3">Leads</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {shown.map((a) =>
              editing === a.id ? (
                <tr key={a.id} className="border-t border-border-subtle bg-bg-elevated/50 align-top">
                  <td className="p-3">{a.cityName}</td>
                  <td className="p-3"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${box} w-40`} /></td>
                  <td className="p-3"><textarea value={draft.aliases} onChange={(e) => setDraft({ ...draft, aliases: e.target.value })} rows={3} className={`${box} w-full`} /></td>
                  <td className="p-3"><input value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: e.target.value })} placeholder="lat" className={`${box} mb-1 w-24`} /><input value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: e.target.value })} placeholder="lng" className={`${box} w-24`} /></td>
                  <td className="p-3">{a.leads}</td>
                  <td className="p-3 whitespace-nowrap">
                    <button type="button" onClick={async () => { if (await post({ id: a.id, name: draft.name, aliases: toAliases(draft.aliases), lat: numOrNull(draft.lat), lng: numOrNull(draft.lng) }, "Saved")) setEditing(null); }} className="me-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="text-xs text-text-muted">Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id} className="border-t border-border-subtle align-top">
                  <td className="p-3 text-text-muted">{a.cityName}</td>
                  <td className="p-3 font-semibold">{a.name}</td>
                  <td className="p-3 text-xs text-text-muted">{a.aliases.join(", ")}</td>
                  <td className="p-3 text-xs text-text-muted" dir="ltr">{a.lat != null && a.lng != null ? `${a.lat.toFixed(3)}, ${a.lng.toFixed(3)}` : "—"}</td>
                  <td className="p-3">{a.leads}</td>
                  <td className="p-3 whitespace-nowrap">
                    <button type="button" onClick={() => { setEditing(a.id); setDraft({ name: a.name, aliases: a.aliases.join(", "), lat: a.lat?.toString() ?? "", lng: a.lng?.toString() ?? "" }); }} className="me-2 text-xs text-accent">Edit</button>
                    <button type="button" onClick={async () => { if (confirm(`Delete area ${a.name}?`)) { await fetch(`/api/admin/areas?id=${a.id}`, { method: "DELETE" }); router.refresh(); } }} className="text-xs text-danger">Delete</button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
