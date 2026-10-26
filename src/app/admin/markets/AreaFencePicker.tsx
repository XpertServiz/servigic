"use client";

// The quick way to geofence: pick a city, tick its areas or roads (or type any other name), and their boundaries are
// added to the zone from OpenStreetMap. Drawing on the map below still works for anything this misses.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Ring } from "./ZoneMapEditor";

type City = { name: string; areas: string[] };

export function AreaFencePicker({ countryCode, marketCities, onAdd }: { countryCode: string; marketCities: string[]; onAdd: (rings: Ring[]) => void }) {
  const [countryName, setCountryName] = useState(countryCode);
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState(marketCities[0] ?? "");
  const [query, setQuery] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/admin/geo/fence?country=${encodeURIComponent(countryCode)}`)
      .then((r) => r.json())
      .then((d: { country: string; cities: City[] }) => {
        setCountryName(d.country);
        setCities(d.cities);
      })
      .catch(() => {});
  }, [countryCode]);

  // The zone's own cities first, then every other city of the country.
  const cityNames = useMemo(() => {
    const own = marketCities.filter(Boolean);
    return [...own, ...cities.map((c) => c.name).filter((n) => !own.some((o) => o.toLowerCase() === n.toLowerCase()))];
  }, [cities, marketCities]);
  const areas = useMemo(() => {
    const known = cities.find((c) => c.name.toLowerCase() === city.toLowerCase())?.areas ?? [];
    return [...extra, ...known.filter((a) => !extra.includes(a))];
  }, [cities, city, extra]);
  const q = query.trim().toLowerCase();
  const shown = q ? areas.filter((a) => a.toLowerCase().includes(q)) : areas;

  function toggle(a: string) {
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function addTyped() {
    const name = query.trim();
    if (name.length < 2) return;
    if (!areas.some((a) => a.toLowerCase() === name.toLowerCase())) setExtra((e) => [name, ...e]);
    setPicked((cur) => new Set(cur).add(areas.find((a) => a.toLowerCase() === name.toLowerCase()) ?? name));
    setQuery("");
  }

  async function addToFence() {
    setBusy(true);
    setNotFound([]);
    try {
      const res = await fetch("/api/admin/geo/fence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryName, city, areas: [...picked] }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not look up the areas");
        return;
      }
      if (data.rings.length) onAdd(data.rings);
      setNotFound(data.notFound);
      toast.success(`${picked.size - data.notFound.length} area(s) added to the map. Check them, then Save market.`);
      setPicked(new Set(data.notFound));
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm";
  return (
    <div className="mb-4 rounded-[12px] border border-border-subtle bg-bg-elevated-2/40 p-4">
      <p className="mb-3 text-sm font-semibold">Quick fence: tick areas instead of drawing</p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-text-muted">
          City
          <select
            className={`${input} block`}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPicked(new Set());
              setExtra([]);
              setNotFound([]);
            }}
          >
            {cityNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[220px] flex-1 text-xs text-text-muted">
          Search or type an area / road name
          <input
            className={`${input} block w-full`}
            value={query}
            placeholder="e.g. Aziziyah, Quba, King Fahd Road"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTyped();
              }
            }}
          />
        </label>
        {q.length >= 2 && !areas.some((a) => a.toLowerCase() === q) && (
          <button type="button" onClick={addTyped} className="rounded-[8px] border border-accent/50 px-3 py-2 text-sm font-semibold text-accent">
            + Add &quot;{query.trim()}&quot;
          </button>
        )}
      </div>
      <div className="mb-3 grid max-h-56 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-[8px] border border-border-subtle p-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.length === 0 && <span className="col-span-full text-xs text-text-muted">No areas listed for this city yet. Type a name above and press Enter.</span>}
        {shown.map((a) => (
          <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={picked.has(a)} onChange={() => toggle(a)} className="accent-[var(--color-accent,#F5A623)]" />
            {a}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={addToFence} disabled={busy || picked.size === 0 || !city} className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50">
          {busy ? `Finding ${picked.size} area(s)…` : `Add ${picked.size} area(s) to the fence`}
        </button>
        {picked.size > 0 && (
          <button type="button" onClick={() => setPicked(new Set())} className="text-xs text-text-muted underline">
            Clear ticks
          </button>
        )}
        {notFound.length > 0 && <span className="text-xs text-danger">Not found on the map: {notFound.join(", ")}. Try another spelling or draw it below.</span>}
      </div>
    </div>
  );
}
