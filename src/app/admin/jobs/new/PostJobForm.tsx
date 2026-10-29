"use client";

import { plural } from "@/lib/plural";
import { useState } from "react";
import { areaExample } from "@/lib/areaExamples";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon: string;
  subServices: { id: string; name: string }[];
}

const input = "w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-sm outline-none focus:border-accent";
const label = "mb-1.5 block text-sm font-semibold text-text-muted";

export function PostJobForm({ categories, cities, places }: { categories: Category[]; cities: string[]; places: { code: string; name: string; cities: { name: string; areas: string[] }[] }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Country -> city -> area: every country and city known to the platform (starter list, Areas, Markets), not just the live markets.
  const firstCountry = places.find((p) => p.cities.some((c) => cities.includes(c.name)))?.code ?? places[0]?.code ?? "";
  const [country, setCountry] = useState(firstCountry);
  const countryCities = places.find((p) => p.code === country)?.cities ?? [];
  const [f, setF] = useState({
    customerName: "",
    phone: "",
    categoryId: "",
    subServiceId: "",
    city: cities[0] ?? "",
    areaLabel: "",
    exactAddress: "",
    coords: "",
    urgency: "TODAY" as "EMERGENCY" | "TODAY" | "SCHEDULED",
    scheduledAt: "",
    description: "",
    budget: "",
  });
  const set = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));
  const category = categories.find((c) => c.id === f.categoryId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: f.customerName,
          phone: f.phone,
          categoryId: f.categoryId,
          subServiceId: f.subServiceId || undefined,
          city: f.city,
          areaLabel: f.areaLabel,
          exactAddress: f.exactAddress,
          coords: f.coords || undefined,
          urgency: f.urgency,
          scheduledAt: f.urgency === "SCHEDULED" && f.scheduledAt ? new Date(f.scheduledAt).toISOString() : undefined,
          description: f.description,
          budgetPKR: f.budget ? Number(f.budget) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not post the job");
      toast.success(`Job posted - ${plural(data.dispatchedCount, "pro")} alerted${data.usedCityCenter ? " (approximate location)" : ""}`);
      router.push(`/admin/jobs/${data.jobId}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Customer name</label>
          <input className={input} required value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} />
        </div>
        <div>
          <label className={label}>Customer phone</label>
          <input className={input} required placeholder="0300 1234567 or +49 151 ..." value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          <p className="mt-1 text-xs text-text-muted">Pakistani numbers can be typed locally; use +country code for others.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Service category</label>
          <select className={input} required value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value, subServiceId: "" })}>
            <option value="">Select...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Sub-service (optional)</label>
          <select className={input} value={f.subServiceId} onChange={(e) => set({ subServiceId: e.target.value })} disabled={!category || category.subServices.length === 0}>
            <option value="">Not specified</option>
            {category?.subServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Country</label>
          <select
            className={input}
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              set({ city: places.find((p) => p.code === e.target.value)?.cities[0]?.name ?? "", areaLabel: "" });
            }}
          >
            {places.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <label className={`${label} mt-3`}>City</label>
          <select className={input} required value={f.city} onChange={(e) => set({ city: e.target.value, areaLabel: "" })}>
            {countryCities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Area / neighbourhood</label>
          {(countryCities.find((c) => c.name === f.city)?.areas.length ?? 0) > 0 && (
            <select className={`${input} mb-2`} value="" onChange={(e) => e.target.value && set({ areaLabel: e.target.value })}>
              <option value="">Pick a major area / zone…</option>
              {countryCities.find((c) => c.name === f.city)?.areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
          <input className={input} required placeholder={`or type it, e.g. ${areaExample(f.city, "en") ?? "the neighbourhood"}`} value={f.areaLabel} onChange={(e) => set({ areaLabel: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={label}>Full address</label>
        <input className={input} required value={f.exactAddress} onChange={(e) => set({ exactAddress: e.target.value })} />
      </div>

      <div>
        <label className={label}>Map location (recommended)</label>
        <input className={input} placeholder="24.8607, 67.0011" value={f.coords} onChange={(e) => set({ coords: e.target.value })} />
        <p className="mt-1 text-xs text-text-muted">
          Right-click the spot in Google Maps and copy the coordinates. Pros are matched by distance from this point; if left empty the city centre is used.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Preferred time</label>
          <select className={input} value={f.urgency} onChange={(e) => set({ urgency: e.target.value as typeof f.urgency })}>
            <option value="EMERGENCY">Emergency - right now</option>
            <option value="TODAY">Today</option>
            <option value="SCHEDULED">Schedule a date and time</option>
          </select>
        </div>
        {f.urgency === "SCHEDULED" && (
          <div>
            <label className={label}>Date and time</label>
            <input type="datetime-local" className={input} required value={f.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} />
          </div>
        )}
      </div>

      <div>
        <label className={label}>Description of the job</label>
        <textarea className={input} rows={4} required minLength={10} value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </div>

      <div className="sm:w-1/2">
        <label className={label}>Customer budget (PKR, optional)</label>
        <input className={input} inputMode="numeric" value={f.budget} onChange={(e) => set({ budget: e.target.value.replace(/\D/g, "") })} />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-[10px] bg-accent px-6 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
      >
        {busy ? "Posting..." : "Post job and alert pros"}
      </button>
    </form>
  );
}
