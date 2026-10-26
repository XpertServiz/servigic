"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Lead } from "@prisma/client";
import { TRADES } from "@/lib/validation/provider";
import { TRADE_LABELS } from "@/lib/trades";
import { buildOutreachMessage } from "@/lib/outreach";
import type { LeadPlaceCountry } from "@/lib/leadPlaces";
const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "ONBOARDED", "NOT_INTERESTED", "CALLBACK"] as const;
const PAGE_SIZE = 50;

type AiResult = { priorityScore: number; likelySoloOperator: boolean; outreachMessage: string };

export function LeadsClient({ initialLeads, aiQualifierEnabled, places, fetchPaused = false }: { initialLeads: Lead[]; aiQualifierEnabled: boolean; places: LeadPlaceCountry[]; fetchPaused?: boolean }) {
  const router = useRouter();
  const [trade, setTrade] = useState<(typeof TRADES)[number]>("PLUMBER");
  const [countryCode, setCountryCode] = useState(places.some((c) => c.code === "PK") ? "PK" : places[0]?.code ?? "");
  const country = places.find((c) => c.code === countryCode);
  const [city, setCity] = useState(country?.cities.find((c) => c.name === "Karachi")?.name ?? country?.cities[0]?.name ?? "");
  const [area, setArea] = useState("");
  const cityAreas = country?.cities.find((c) => c.name.toLowerCase() === city.trim().toLowerCase())?.areas ?? [];
  const [searchTerm, setSearchTerm] = useState("plumber");
  // Every city that already has leads, for the table filter below.
  const leadCities = useMemo(() => [...new Set(initialLeads.map((l) => l.city))].sort(), [initialLeads]);
  const [fetching, setFetching] = useState(false);
  // Why Google gave nothing (for example billing not enabled), shown under the button instead of a bare "0 results".
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ found: number; saved: number; skipped: number } | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});
  const [aiPendingId, setAiPendingId] = useState<string | null>(null);

  // Table filters — separate from the "Fetch from Google Places" trade/city
  // above, which only control what gets *fetched*, not what's *displayed*.
  const [filterTrade, setFilterTrade] = useState<(typeof TRADES)[number] | "ALL">("ALL");
  const [filterCity, setFilterCity] = useState<string | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<(typeof STATUSES)[number] | "ALL">("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // The page belongs to the filter combination it was chosen under: changing a filter falls back to page 1
  // without needing an effect to reset it.
  const filterKey = `${filterTrade}|${filterCity}|${filterStatus}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });

  const filteredLeads = useMemo(
    () =>
      initialLeads.filter(
        (l) =>
          (filterTrade === "ALL" || l.trade === filterTrade) &&
          (filterCity === "ALL" || l.city === filterCity) &&
          (filterStatus === "ALL" || l.status === filterStatus)
      ),
    [initialLeads, filterTrade, filterCity, filterStatus]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));

  // Stay on a valid page when the list shrinks (filters, or router.refresh() after an edit).
  const page = pageState.key === filterKey ? Math.min(pageState.page, totalPages) : 1;
  const setPage = (next: number | ((p: number) => number)) =>
    setPageState({ key: filterKey, page: typeof next === "function" ? next(page) : next });

  const pagedLeads = useMemo(
    () => filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredLeads, page]
  );

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selected.has(l.id));

  function toggleSelectAll() {
    setSelected(() => {
      if (allFilteredSelected) return new Set();
      return new Set(filteredLeads.map((l) => l.id));
    });
  }

  function toggleSelect(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectedOrFilteredLeads() {
    return selected.size > 0 ? filteredLeads.filter((l) => selected.has(l.id)) : filteredLeads;
  }

  async function copyNumbers() {
    const leads = selectedOrFilteredLeads();
    const numbers = leads.map((l) => l.phone).join("\n");
    await navigator.clipboard.writeText(numbers);
    toast.success(`Copied ${leads.length} number${leads.length === 1 ? "" : "s"} — paste into WhatsApp's "New broadcast" contact picker.`);
  }

  function exportCsv() {
    const leads = selectedOrFilteredLeads();
    const rows = [
      ["Business", "Phone", "Trade", "City", "Status"],
      ...leads.map((l) => [l.businessName, l.phone, TRADE_LABELS[l.trade]?.name ?? l.trade, l.city, l.status]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servigic-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchLeads() {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/leads/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, country: country?.name ?? countryCode, city, area, searchTerm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to fetch leads");
        toast.error("Google did not return any leads - see the message under the button", { duration: 8000 });
        return;
      }
      setLastResult(data);
      toast.success(`Found ${data.found}, saved ${data.saved} new leads`);
      router.refresh();
    } finally {
      setFetching(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  async function qualifyWithAi(leadId: string) {
    setAiPendingId(leadId);
    try {
      const res = await fetch("/api/ai/leads/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: [leadId] }),
      });
      const data = await res.json();
      if (!res.ok || !data.results?.[0]) {
        toast.error(data.error || "AI qualification isn't available right now");
        return;
      }
      setAiResults((r) => ({ ...r, [leadId]: data.results[0] }));
    } finally {
      setAiPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Trade</label>
          <select
            value={trade}
            onChange={(e) => {
              const next = e.target.value as typeof trade;
              setTrade(next);
              setSearchTerm(TRADE_LABELS[next].name.toLowerCase());
            }}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {TRADE_LABELS[t].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Country</label>
          <select
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setCity(places.find((c) => c.code === e.target.value)?.cities[0]?.name ?? "");
              setArea("");
            }}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            {places.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">City (pick or type)</label>
          <input
            list="lead-cities"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setArea("");
            }}
            placeholder="City"
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />
          <datalist id="lead-cities">
            {country?.cities.map((c) => <option key={c.name} value={c.name} />)}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Area (optional, pick or type)</label>
          <input
            list="lead-areas"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={cityAreas[0] ? `e.g. ${cityAreas.slice(0, 2).join(", ")}` : "Whole city"}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />
          <datalist id="lead-areas">
            {cityAreas.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Professionals to find (pick or type)</label>
          <input
            list="lead-professions"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />
        </div>
        <datalist id="lead-professions">
          {TRADES.map((t) => <option key={t} value={TRADE_LABELS[t].name.toLowerCase()} />)}
        </datalist>
        <button
          onClick={fetchLeads}
          disabled={fetching || fetchPaused || !city.trim() || searchTerm.trim().length < 2}
          className="rounded-[8px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {fetching ? "Fetching…" : fetchPaused ? "Paused until next month" : "Fetch from Google Places"}
        </button>
        {fetchError && (
          <div className="w-full rounded-[10px] border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <p className="font-semibold">{fetchError}</p>
            {/billing|PERMISSION_DENIED|REQUEST_DENIED|not enabled|API key/i.test(fetchError) && (
              <p className="mt-1 text-xs text-text-muted">
                Fix: in Google Cloud Console open the project of this key, switch on <b>Billing</b>, enable <b>Places API (New)</b> (and Places API), and make sure the key is not restricted to other APIs. Then try again.
              </p>
            )}
          </div>
        )}
        {lastResult && (
          <span className="text-xs text-text-muted">
            Found {lastResult.found} · Saved {lastResult.saved} · Skipped {lastResult.skipped}
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Filter: Trade</label>
          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value as typeof filterTrade)}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            <option value="ALL">All trades</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {TRADE_LABELS[t].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Filter: City</label>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            <option value="ALL">All cities</option>
            {leadCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Filter: Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-text-muted">
          {filteredLeads.length} lead{filteredLeads.length === 1 ? "" : "s"}
          {selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={copyNumbers}
            disabled={filteredLeads.length === 0}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            📋 Copy numbers
          </button>
          <button
            onClick={exportCsv}
            disabled={filteredLeads.length === 0}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-text-muted">
        WhatsApp doesn&apos;t allow one-click bulk sending to numbers that haven&apos;t saved your contact or opted in —
        that&apos;s a platform rule, not a limit of this page. Use <strong>Copy numbers</strong> to paste into WhatsApp
        Business App&apos;s own &quot;New broadcast&quot; contact picker (reaches contacts who&apos;ve saved your
        number), or <strong>Export CSV</strong> for the Cloud API template-message route once that&apos;s set up.
      </p>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
              </th>
              <th className="p-4">Business</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Trade / City</th>
              <th className="p-4">Imported</th>
              <th className="p-4">Status</th>
              <th className="p-4">AI Priority</th>
              <th className="p-4">Outreach</th>
            </tr>
          </thead>
          <tbody>
            {pagedLeads.map((lead) => {
              const ai = aiResults[lead.id];
              const message = ai?.outreachMessage ?? buildOutreachMessage(lead.businessName, TRADE_LABELS[lead.trade]?.name ?? lead.trade, lead.city);
              return (
                <tr key={lead.id} className="border-t border-border-subtle">
                  <td className="p-4">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                  </td>
                  <td className="p-4 font-semibold">{lead.businessName}</td>
                  <td className="p-4 text-text-muted">{lead.phone}</td>
                  <td className="p-4 text-text-muted">
                    {TRADE_LABELS[lead.trade]?.name} · {lead.city}
                  </td>
                  <td className="p-4 whitespace-nowrap text-text-muted">
                    {new Date(lead.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="p-4">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="rounded-[6px] border border-border-subtle bg-bg-elevated-2 px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    {ai ? (
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                        {ai.priorityScore}/100 {ai.likelySoloOperator ? "· Solo" : "· Company"}
                      </span>
                    ) : aiQualifierEnabled ? (
                      <button
                        onClick={() => qualifyWithAi(lead.id)}
                        disabled={aiPendingId === lead.id}
                        className="text-xs font-semibold text-accent disabled:opacity-60"
                      >
                        {aiPendingId === lead.id ? "Thinking…" : "✨ AI Qualify"}
                      </button>
                    ) : (
                      <span className="text-xs text-text-dim text-text-muted">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-secondary"
                    >
                      WhatsApp →
                    </a>
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-text-muted">
                  {initialLeads.length === 0 ? "No leads yet — fetch some above." : "No leads match these filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredLeads.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              // Keep the pager compact on large lead counts: always show the
              // first/last page and a window around the current page,
              // collapsing the rest into a "…" rather than one button per page.
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center gap-1">
                  {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-xs text-text-muted">…</span>}
                  <button
                    onClick={() => setPage(n)}
                    className={`rounded-[8px] border px-3 py-1.5 text-xs font-semibold ${
                      n === page ? "border-accent bg-accent/10 text-accent" : "border-border-subtle bg-bg-elevated-2"
                    }`}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
