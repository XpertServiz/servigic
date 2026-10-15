"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface MarketView {
  id: string;
  countryCode: string;
  name: string;
  cities: string[];
  enabled: boolean;
  status: "WAITLIST" | "PILOT" | "LIVE";
  currency: string;
  phoneCode: string;
  timezone: string;
  activePros: number;
  waitingPros: number;
  categories: Record<string, { enabled: boolean; maxActivePros: number | null }>;
  perTrade: Record<string, { active: number; waiting: number }>;
}
interface WaitlistRow {
  countryCode: string;
  zone: string | null;
  trade: string | null;
  role: string | null;
  count: number;
}

const STATUSES = ["WAITLIST", "PILOT", "LIVE"] as const;
const CURRENCIES = ["PKR", "USD", "CAD", "EUR", "PLN", "SAR", "AED", "QAR"] as const;
const input = "w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm outline-none focus:border-accent";
const pretty = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function MarketsClient({ markets, allTrades, waitlist }: { markets: MarketView[]; allTrades: string[]; waitlist: WaitlistRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      {markets.map((m) => (
        <MarketCard key={m.id} market={m} allTrades={allTrades} />
      ))}
      <NewMarket />
      <Waitlist rows={waitlist} />
    </div>
  );
}

function MarketCard({ market, allTrades }: { market: MarketView; allTrades: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    countryCode: market.countryCode,
    name: market.name,
    cities: market.cities.join(", "),
    enabled: market.enabled,
    status: market.status,
    currency: market.currency,
    phoneCode: market.phoneCode,
    timezone: market.timezone,
  });
  const [matrix, setMatrix] = useState<Record<string, { enabled: boolean; maxActivePros: string }>>(
    Object.fromEntries(allTrades.map((t) => [t, { enabled: market.categories[t]?.enabled ?? false, maxActivePros: market.categories[t]?.maxActivePros?.toString() ?? "" }])),
  );
  const [open, setOpen] = useState(market.enabled);
  const [busy, setBusy] = useState(false);

  async function saveMarket() {
    setBusy(true);
    try {
      const data = await call(`/api/admin/markets/${market.id}`, "PUT", { ...form, cities: form.cities.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success(data.activated ? `Saved. ${data.activated} waiting pro(s) activated.` : "Market saved");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveMatrix() {
    setBusy(true);
    try {
      const categories = allTrades
        .filter((t) => matrix[t].enabled || market.categories[t])
        .map((t) => ({ trade: t, enabled: matrix[t].enabled, maxActivePros: matrix[t].maxActivePros === "" ? null : Number(matrix[t].maxActivePros) }));
      const data = await call(`/api/admin/markets/${market.id}/categories`, "PUT", { categories });
      toast.success(data.activated ? `Saved. ${data.activated} waiting pro(s) activated.` : "Categories saved");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm(`Delete the market "${market.name}"? Jobs and pros in its cities will have no market.`)) return;
    await call(`/api/admin/markets/${market.id}`, "DELETE").catch((e) => toast.error(e.message));
    router.refresh();
  }

  const accepting = form.enabled && form.status !== "WAITLIST";
  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {market.name} <span className="text-text-muted">({market.countryCode})</span>
          </h2>
          <p className="text-xs text-text-muted">
            {market.activePros} active pro(s) · {market.waitingPros} waiting ·{" "}
            <span className={accepting ? "font-semibold text-secondary" : "font-semibold text-danger"}>{accepting ? "accepting jobs" : "NOT accepting jobs"}</span>
          </p>
        </div>
        <button onClick={() => setOpen(!open)} className="text-sm font-semibold text-accent">
          {open ? "Hide settings" : "Edit"}
        </button>
      </div>

      {open && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="text-xs text-text-muted">
              Name
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-xs text-text-muted">
              Country (ISO)
              <input className={input} maxLength={2} value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })} />
            </label>
            <label className="text-xs text-text-muted">
              Status
              <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MarketView["status"] })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "WAITLIST" ? "Waitlist (no jobs)" : s === "PILOT" ? "Pilot (early pros get perks)" : "Live"}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-secondary" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Enabled
            </label>
            <label className="col-span-2 text-xs text-text-muted md:col-span-2">
              Cities (comma-separated; this is how jobs and users map to the market)
              <input className={input} value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} />
            </label>
            <label className="text-xs text-text-muted">
              Currency
              <select className={input} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-text-muted">
              Phone code
              <input className={input} value={form.phoneCode} onChange={(e) => setForm({ ...form, phoneCode: e.target.value })} />
            </label>
            <label className="text-xs text-text-muted md:col-span-2">
              Timezone (for pro quiet hours)
              <input className={input} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </label>
          </div>
          <div className="mb-6 flex gap-3">
            <button onClick={saveMarket} disabled={busy} className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60">
              Save market
            </button>
            <button onClick={remove} className="rounded-[10px] border border-danger/40 px-5 py-2.5 text-sm font-bold text-danger">
              Delete
            </button>
          </div>

          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-text-muted">Categories in this market</h3>
          <div className="mb-4 overflow-x-auto rounded-[12px] border border-border-subtle">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-bg-elevated-2 text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="p-3">On</th>
                  <th className="p-3">Trade</th>
                  <th className="p-3">Active pros</th>
                  <th className="p-3">Waiting</th>
                  <th className="p-3">Cap on active pros (blank = no cap)</th>
                </tr>
              </thead>
              <tbody>
                {allTrades.map((t) => (
                  <tr key={t} className="border-t border-border-subtle">
                    <td className="p-3">
                      <input type="checkbox" className="h-4 w-4 accent-secondary" checked={matrix[t].enabled} onChange={(e) => setMatrix({ ...matrix, [t]: { ...matrix[t], enabled: e.target.checked } })} />
                    </td>
                    <td className="p-3 font-semibold">{pretty(t)}</td>
                    <td className="p-3 text-text-muted">{market.perTrade[t]?.active ?? 0}</td>
                    <td className="p-3 text-text-muted">{market.perTrade[t]?.waiting ?? 0}</td>
                    <td className="p-3">
                      <input type="number" min={0} className={`${input} max-w-[120px]`} value={matrix[t].maxActivePros} onChange={(e) => setMatrix({ ...matrix, [t]: { ...matrix[t], maxActivePros: e.target.value } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={saveMatrix} disabled={busy} className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60">
            Save categories &amp; caps
          </button>
        </>
      )}
    </div>
  );
}

function NewMarket() {
  const router = useRouter();
  const [form, setForm] = useState({ countryCode: "", name: "", cities: "", currency: "PKR", phoneCode: "+92", timezone: "Asia/Karachi" });
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      await call("/api/admin/markets", "POST", {
        ...form,
        cities: form.cities.split(",").map((s) => s.trim()).filter(Boolean),
        enabled: false,
        status: "WAITLIST",
      });
      toast.success("Market created (disabled, waitlist). Switch on its categories, then enable it.");
      setForm({ countryCode: "", name: "", cities: "", currency: "PKR", phoneCode: "+92", timezone: "Asia/Karachi" });
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-[14px] border border-dashed border-border-subtle p-5">
      <h2 className="mb-3 font-bold">Add a market</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <input className={input} placeholder="Country (CA)" maxLength={2} value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })} />
        <input className={input} placeholder="Name (Toronto)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={`${input} col-span-2`} placeholder="Cities, comma-separated" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} />
        <select className={input} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input className={input} placeholder="+1" value={form.phoneCode} onChange={(e) => setForm({ ...form, phoneCode: e.target.value })} />
        <input className={`${input} col-span-2`} placeholder="Timezone (America/Toronto)" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
      </div>
      <button onClick={create} disabled={busy || !form.countryCode || !form.name} className="mt-3 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-50">
        Create market
      </button>
    </div>
  );
}

function Waitlist({ rows }: { rows: WaitlistRow[] }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold">Waitlist demand</h2>
      <p className="mb-3 text-sm text-text-muted">People who tapped &quot;notify me&quot; for an area or a coming-soon category. Use it to decide where to open next.</p>
      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Country</th>
              <th className="p-4">Zone</th>
              <th className="p-4">Category</th>
              <th className="p-4">Who</th>
              <th className="p-4">Signups</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((r, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  <td className="p-4 font-semibold">{r.countryCode}</td>
                  <td className="p-4 text-text-muted">{r.zone ?? "—"}</td>
                  <td className="p-4 text-text-muted">{r.trade ? pretty(r.trade) : "Whole area"}</td>
                  <td className="p-4 text-text-muted">{r.role === "PROVIDER" ? "Pros" : "Customers"}</td>
                  <td className="p-4 font-bold">{r.count}</td>
                </tr>
              ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-text-muted">
                  No waitlist signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
