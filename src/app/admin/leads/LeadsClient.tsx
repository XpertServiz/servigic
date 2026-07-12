"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Lead } from "@prisma/client";
import { TRADES } from "@/lib/validation/provider";
import { TRADE_LABELS } from "@/lib/trades";
import { buildOutreachMessage } from "@/lib/outreach";
import { LIVE_CITIES as CITIES } from "@/lib/markets";
const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "ONBOARDED", "NOT_INTERESTED", "CALLBACK"] as const;

type AiResult = { priorityScore: number; likelySoloOperator: boolean; outreachMessage: string };

export function LeadsClient({ initialLeads, aiQualifierEnabled }: { initialLeads: Lead[]; aiQualifierEnabled: boolean }) {
  const router = useRouter();
  const [trade, setTrade] = useState<(typeof TRADES)[number]>("PLUMBER");
  const [city, setCity] = useState(CITIES[0]);
  const [searchTerm, setSearchTerm] = useState("plumber");
  const [fetching, setFetching] = useState(false);
  const [lastResult, setLastResult] = useState<{ found: number; saved: number; skipped: number } | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});
  const [aiPendingId, setAiPendingId] = useState<string | null>(null);

  async function fetchLeads() {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/leads/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, city, searchTerm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to fetch leads");
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
          <select value={trade} onChange={(e) => setTrade(e.target.value as typeof trade)} className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm">
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {TRADE_LABELS[t].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm">
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-muted">Search term</label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={fetchLeads}
          disabled={fetching}
          className="rounded-[8px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {fetching ? "Fetching…" : "Fetch from Google Places"}
        </button>
        {lastResult && (
          <span className="text-xs text-text-muted">
            Found {lastResult.found} · Saved {lastResult.saved} · Skipped {lastResult.skipped}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Business</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Trade / City</th>
              <th className="p-4">Status</th>
              <th className="p-4">AI Priority</th>
              <th className="p-4">Outreach</th>
            </tr>
          </thead>
          <tbody>
            {initialLeads.map((lead) => {
              const ai = aiResults[lead.id];
              const message = ai?.outreachMessage ?? buildOutreachMessage(lead.businessName, TRADE_LABELS[lead.trade]?.name ?? lead.trade, lead.city);
              return (
                <tr key={lead.id} className="border-t border-border-subtle">
                  <td className="p-4 font-semibold">{lead.businessName}</td>
                  <td className="p-4 text-text-muted">{lead.phone}</td>
                  <td className="p-4 text-text-muted">
                    {TRADE_LABELS[lead.trade]?.name} · {lead.city}
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
            {initialLeads.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted">
                  No leads yet — fetch some above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
