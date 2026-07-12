"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TRADE_LABELS } from "@/lib/trades";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AddCategoryButton({ availableTrades }: { availableTrades: readonly string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trade, setTrade] = useState(availableTrades[0] ?? "");
  const [name, setName] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pending, setPending] = useState(false);

  if (availableTrades.length === 0) {
    return (
      <span className="rounded-[10px] border border-border-subtle px-4 py-2.5 text-sm text-text-muted">
        All trades in use
      </span>
    );
  }

  async function submit() {
    if (!trade || !name.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade,
          name: name.trim(),
          slug: slugify(name),
          icon: TRADE_LABELS[trade]?.icon ?? "🛠️",
          minPricePKR: minPrice ? Number(minPrice) : undefined,
          maxPricePKR: maxPrice ? Number(maxPrice) : undefined,
          activeCities: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add category");
        return;
      }
      toast.success("Category added");
      setOpen(false);
      setName("");
      setMinPrice("");
      setMaxPrice("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-none rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground"
      >
        + Add Category
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
            <h3 className="mb-4 font-bold">Add category</h3>

            <label className="mb-1.5 block text-xs font-semibold text-text-muted">Trade</label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="mb-3 w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            >
              {availableTrades.map((t) => (
                <option key={t} value={t}>
                  {TRADE_LABELS[t]?.icon} {TRADE_LABELS[t]?.name ?? t}
                </option>
              ))}
            </select>

            <label className="mb-1.5 block text-xs font-semibold text-text-muted">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={TRADE_LABELS[trade]?.name}
              className="mb-3 w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            />

            <label className="mb-1.5 block text-xs font-semibold text-text-muted">Price range (PKR, optional)</label>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              />
              <span className="text-text-muted">–</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={pending || !name.trim()}
                className="flex-1 rounded-[8px] bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
              >
                {pending ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-[8px] border border-border-subtle px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
