"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ServiceCategory, SubService } from "@prisma/client";
import { UploadDropzone } from "@/lib/uploadthing";
import { LIVE_CITIES as CITIES } from "@/lib/markets";

type CategoryWithSub = ServiceCategory & { subServices: SubService[] };
const URGENCY_OPTIONS = [
  { value: "EMERGENCY", label: "🚨 Emergency — now" },
  { value: "TODAY", label: "Today" },
  { value: "SCHEDULED", label: "Schedule" },
] as const;

export function PostJobForm({ categories, aiTriageEnabled }: { categories: CategoryWithSub[]; aiTriageEnabled: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? "",
    subServiceId: "",
    title: "",
    description: "",
    photos: [] as string[],
    urgency: "TODAY" as (typeof URGENCY_OPTIONS)[number]["value"],
    scheduledAt: "",
    city: CITIES[0],
    areaLabel: "",
    exactAddress: "",
    lat: 24.8607,
    lng: 67.0011,
    budgetPKR: "",
  });
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
      toast.success("Location captured");
    });
  }

  async function suggestFromDescription() {
    setAiPending(true);
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: form.description }),
      });
      if (!res.ok) {
        toast.error("AI suggestions aren't available right now — pick manually");
        return;
      }
      const suggestion = await res.json();
      const matchedCategory = categories.find((c) => c.name === suggestion.suggestedCategory);
      setForm((f) => ({
        ...f,
        categoryId: matchedCategory?.id ?? f.categoryId,
        urgency: suggestion.suggestedUrgency,
        budgetPKR: String(suggestion.suggestedBudgetMaxPKR),
      }));
      toast.success(suggestion.reasoning || "Suggestion applied");
    } finally {
      setAiPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          subServiceId: form.subServiceId || undefined,
          scheduledAt: form.urgency === "SCHEDULED" && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
          budgetPKR: form.budgetPKR ? Number(form.budgetPKR) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to post job");
        return;
      }
      toast.success(`Job posted — ${data.dispatchedCount} pro(s) alerted`);
      router.push(`/jobs/${data.job.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Category</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setForm({ ...form, categoryId: c.id, subServiceId: "" })}
              className={`rounded-[8px] border px-3 py-3 text-center text-xs font-semibold ${
                form.categoryId === c.id ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
              }`}
            >
              <div className="mb-1 text-lg">{c.icon}</div>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && selectedCategory.subServices.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">Sub-service (optional)</label>
          <select
            value={form.subServiceId}
            onChange={(e) => setForm({ ...form, subServiceId: e.target.value })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          >
            <option value="">General</option>
            {selectedCategory.subServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Job title</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. AC not cooling"
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Description</label>
        <textarea
          required
          minLength={10}
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
        {aiTriageEnabled && form.description.trim().length >= 10 && (
          <button
            type="button"
            onClick={suggestFromDescription}
            disabled={aiPending}
            className="mt-2 rounded-[8px] border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-60"
          >
            {aiPending ? "Thinking…" : "✨ Suggest category, urgency & budget"}
          </button>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Photos (up to 6)</label>
        {form.photos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {form.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-16 w-16 rounded-[8px] object-cover" />
            ))}
          </div>
        )}
        <UploadDropzone
          endpoint="jobPhotos"
          onClientUploadComplete={(res) => {
            setForm((f) => ({ ...f, photos: [...f.photos, ...res.map((r) => r.ufsUrl)] }));
          }}
          onUploadError={(e) => {
            toast.error(e.message);
          }}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Urgency</label>
        <div className="grid grid-cols-3 gap-2">
          {URGENCY_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => setForm({ ...form, urgency: o.value })}
              className={`rounded-[8px] border px-3 py-2.5 text-sm font-semibold ${
                form.urgency === o.value ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {form.urgency === "SCHEDULED" && (
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            className="mt-3 w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">City</label>
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">Area</label>
          <input
            required
            value={form.areaLabel}
            onChange={(e) => setForm({ ...form, areaLabel: e.target.value })}
            placeholder="e.g. Gulshan-e-Iqbal"
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">
          Exact address <span className="text-text-dim">(hidden until payment)</span>
        </label>
        <input
          required
          value={form.exactAddress}
          onChange={(e) => setForm({ ...form, exactAddress: e.target.value })}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={useMyLocation}
          className="mt-2 rounded-[8px] border border-border-subtle px-3 py-1.5 text-sm font-semibold hover:border-accent hover:text-accent"
        >
          📍 Use my current location
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Budget in PKR (optional)</label>
        <input
          type="number"
          value={form.budgetPKR}
          onChange={(e) => setForm({ ...form, budgetPKR: e.target.value })}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-accent px-6 py-3.5 font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post Job — Get Bids"}
      </button>
    </form>
  );
}
