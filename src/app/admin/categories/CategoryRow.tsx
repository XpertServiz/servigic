"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ServiceCategory, SubService } from "@prisma/client";
import { clsx } from "clsx";
import { EmojiPicker } from "@/components/admin/EmojiPicker";

type CategoryWithSub = ServiceCategory & { subServices: SubService[] };

export function CategoryRow({ category, places }: { category: CategoryWithSub; places: { code: string; name: string; cities: { name: string }[] }[] }) {
  const router = useRouter();
  const [minPrice, setMinPrice] = useState(category.minPricePKR ?? 0);
  const [maxPrice, setMaxPrice] = useState(category.maxPricePKR ?? 0);
  const [cities, setCities] = useState<string[]>(category.activeCities);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [editing, setEditing] = useState(false);
  // Country first, then that country's cities (the selected cities of every country are kept).
  const [country, setCountry] = useState(places.find((p) => p.cities.some((c) => category.activeCities.includes(c.name)))?.code ?? places[0]?.code ?? "");
  const known = new Set(places.flatMap((p) => p.cities.map((c) => c.name)));
  const stray = cities.filter((c) => !known.has(c));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function toggleCity(city: string) {
    setCities((c) => (c.includes(city) ? c.filter((x) => x !== city) : [...c, city]));
  }

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minPricePKR: minPrice, maxPricePKR: maxPrice, activeCities: cities, name: name.trim() || category.name, icon: icon.trim() || category.icon }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    } finally {
      setPending(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <EmojiPicker value={icon} onChange={setIcon} />
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-52 rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-1.5 text-sm" />
            </div>
          ) : (
            <>
              <span className="text-xl">{icon}</span> {name}
              <span className="text-xs font-normal text-text-muted">/{category.slug}</span>
              <button onClick={() => setEditing(true)} className="ml-1 rounded-[6px] border border-border-subtle px-2 py-0.5 text-xs font-semibold text-text-muted">
                Edit name / icon
              </button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-[8px] bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            Save
          </button>
          {confirmingDelete ? (
            <>
              <button
                onClick={remove}
                disabled={pending}
                className="rounded-[8px] bg-danger px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Confirm delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-[8px] border border-border-subtle px-3 py-1.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-[8px] border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3 text-sm">
        <span className="text-text-muted">Price range (PKR)</span>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(Number(e.target.value))}
          className="w-28 rounded-[6px] border border-border-subtle bg-bg-elevated-2 px-2 py-1"
        />
        <span className="text-text-muted">–</span>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-28 rounded-[6px] border border-border-subtle bg-bg-elevated-2 px-2 py-1"
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-muted">Country</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-[6px] border border-border-subtle bg-bg-elevated-2 px-2 py-1">
          {places.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} ({p.cities.filter((c) => cities.includes(c.name)).length}/{p.cities.length})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        {(places.find((p) => p.code === country)?.cities ?? []).map(({ name: city }) => (
          <button
            key={city}
            onClick={() => toggleCity(city)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              cities.includes(city) ? "border-secondary bg-secondary/10 text-secondary" : "border-border-subtle text-text-muted"
            )}
          >
            {city}
          </button>
        ))}
      </div>
      {stray.length > 0 && (
        <div className="mb-2 text-xs text-text-muted">
          Old entries that are not a known city (tap to remove):{" "}
          {stray.map((c) => (
            <button key={c} onClick={() => toggleCity(c)} className="mr-1 rounded-full border border-danger/40 px-2 py-0.5 text-danger">
              {c} ✕
            </button>
          ))}
        </div>
      )}

      {category.subServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-subtle pt-3">
          {category.subServices.map((s) => (
            <span key={s.id} className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-muted">
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
