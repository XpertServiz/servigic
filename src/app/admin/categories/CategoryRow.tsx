"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ServiceCategory, SubService } from "@prisma/client";
import { clsx } from "clsx";

type CategoryWithSub = ServiceCategory & { subServices: SubService[] };

export function CategoryRow({ category, launchCities }: { category: CategoryWithSub; launchCities: string[] }) {
  const router = useRouter();
  const [minPrice, setMinPrice] = useState(category.minPricePKR ?? 0);
  const [maxPrice, setMaxPrice] = useState(category.maxPricePKR ?? 0);
  const [cities, setCities] = useState<string[]>(category.activeCities);
  const [pending, setPending] = useState(false);

  function toggleCity(city: string) {
    setCities((c) => (c.includes(city) ? c.filter((x) => x !== city) : [...c, city]));
  }

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minPricePKR: minPrice, maxPricePKR: maxPrice, activeCities: cities }),
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

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">{category.icon}</span> {category.name}
          <span className="text-xs font-normal text-text-muted">/{category.slug}</span>
        </div>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-[8px] bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          Save
        </button>
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

      <div className="mb-2 flex flex-wrap gap-2">
        {launchCities.map((city) => (
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
