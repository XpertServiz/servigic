"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

interface PlanView {
  id: string;
  categoryName: string;
  categoryIcon: string;
  areaLabel: string;
  frequency: string;
  pricePerVisitPKR: number;
  nextDueDate: string;
  status: string;
}

const FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUAL", label: "Every 6 months" },
] as const;

export function PlansClient({ plans, categories, cities }: { plans: PlanView[]; categories: CategoryOption[]; cities: string[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(() => ({
    categoryId: categories[0]?.id ?? "",
    city: cities[0] ?? "",
    areaLabel: "",
    exactAddress: "",
    frequency: "QUARTERLY" as (typeof FREQUENCY_OPTIONS)[number]["value"],
    pricePerVisitPKR: "",
    firstVisitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }));

  async function createPlan() {
    if (!form.areaLabel.trim() || !form.exactAddress.trim() || !form.pricePerVisitPKR) return;
    setPending(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricePerVisitPKR: Number(form.pricePerVisitPKR),
          lat: 24.8607,
          lng: 67.0011,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to set up plan");
        return;
      }
      toast.success("Plan created — we'll auto-post your next visit");
      setShowForm(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function setStatus(id: string, status: "ACTIVE" | "PAUSED" | "CANCELLED") {
    const res = await fetch(`/api/plans/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update plan");
      return;
    }
    toast.success(`Plan ${status.toLowerCase()}`);
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => setShowForm((s) => !s)}
        className="mb-6 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"
      >
        {showForm ? "Cancel" : "+ Set Up a Plan"}
      </button>

      {showForm && (
        <div className="mb-8 rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">City</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">Area</label>
              <input
                value={form.areaLabel}
                onChange={(e) => setForm({ ...form, areaLabel: e.target.value })}
                placeholder="e.g. Gulshan-e-Iqbal"
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-text-muted">Exact address</label>
            <input
              value={form.exactAddress}
              onChange={(e) => setForm({ ...form, exactAddress: e.target.value })}
              className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">Est. price per visit (PKR)</label>
              <input
                type="number"
                value={form.pricePerVisitPKR}
                onChange={(e) => setForm({ ...form, pricePerVisitPKR: e.target.value })}
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">First visit date</label>
              <input
                type="date"
                value={form.firstVisitDate}
                onChange={(e) => setForm({ ...form, firstVisitDate: e.target.value })}
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={createPlan}
            disabled={pending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create Plan"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-bold">
                  {p.categoryIcon} {p.categoryName}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {p.areaLabel} · {p.frequency.replace("_", " ").toLowerCase()}
                </span>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                  p.status === "ACTIVE" ? "border-secondary/40 text-secondary" : "border-border-subtle text-text-muted"
                }`}
              >
                {p.status}
              </span>
            </div>
            <div className="mb-3 text-sm text-text-muted">
              Next visit: {new Date(p.nextDueDate).toLocaleDateString()} · ~PKR {p.pricePerVisitPKR.toLocaleString()}/visit
            </div>
            <div className="flex gap-2">
              {p.status === "ACTIVE" && (
                <button onClick={() => setStatus(p.id, "PAUSED")} className="text-xs font-semibold text-accent">
                  Pause
                </button>
              )}
              {p.status === "PAUSED" && (
                <button onClick={() => setStatus(p.id, "ACTIVE")} className="text-xs font-semibold text-secondary">
                  Resume
                </button>
              )}
              {p.status !== "CANCELLED" && (
                <button onClick={() => setStatus(p.id, "CANCELLED")} className="text-xs font-semibold text-danger">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No plans yet — never miss your AC service, generator checkup, or water tank cleaning again.
          </div>
        )}
      </div>
    </div>
  );
}
