"use client";

import { plural } from "@/lib/plural";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface ConciergeJob {
  id: string;
  title: string;
  icon: string;
  city: string;
  areaLabel: string;
  ageMin: number;
  notified: number;
  customerName: string;
  customerPhone: string;
  candidates: { id: string; name: string; phone: string; distanceKm: number | null; online: boolean }[];
}

export function ConciergeClient({ jobs }: { jobs: ConciergeJob[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function invite(jobId: string, providerId: string) {
    setBusy(jobId + providerId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not invite");
      toast.success("Pro alerted");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (jobs.length === 0) return <p className="rounded-[14px] border border-border-subtle p-6 text-center text-sm text-text-muted">No unmatched jobs right now. 🎉</p>;

  return (
    <div className="flex flex-col gap-4">
      {jobs.map((j) => (
        <div key={j.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-bold">
                <span className="mr-2">{j.icon}</span>
                {j.title}
              </div>
              <div className="text-xs text-text-muted">
                {j.areaLabel}, {j.city} · open {j.ageMin} min · {plural(j.notified, "pro")} alerted, no bids
              </div>
            </div>
            <div className="text-right text-xs text-text-muted">
              Customer: <b className="text-text">{j.customerName}</b>
              <br />
              <a href={`tel:${j.customerPhone}`} className="text-accent">
                {j.customerPhone}
              </a>
            </div>
          </div>
          {j.candidates.length === 0 ? (
            <p className="text-sm text-text-muted">No verified, active pro for this trade in {j.city} yet. Recruit one, or contact the customer.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {j.candidates.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm">
                  <span>
                    <b>{c.name}</b> <span className={c.online ? "text-secondary" : "text-text-muted"}>· {c.online ? "online" : "offline"}</span>
                    {c.distanceKm != null && <span className="text-text-muted"> · {c.distanceKm.toFixed(1)} km</span>} ·{" "}
                    <a href={`tel:${c.phone}`} className="text-accent">
                      {c.phone}
                    </a>
                  </span>
                  <button
                    onClick={() => invite(j.id, c.id)}
                    disabled={busy === j.id + c.id}
                    className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-60"
                  >
                    Alert this pro
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
