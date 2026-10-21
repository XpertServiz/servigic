import { prisma } from "@/lib/prisma";
import { loadAreas, matchAreaByText } from "@/lib/areas";
import { AreasClient } from "./AreasClient";

export const dynamic = "force-dynamic";

export default async function AdminAreasPage() {
  const [areas, cities, leadCounts, unmatchedLeads, waitlistAreas] = await Promise.all([
    loadAreas(),
    prisma.city.findMany({ orderBy: [{ countryCode: "asc" }, { name: "asc" }] }),
    prisma.lead.groupBy({ by: ["areaId"], _count: { _all: true }, where: { areaId: { not: null } } }),
    prisma.lead.groupBy({ by: ["areaRaw"], _count: { _all: true }, where: { areaId: null, areaRaw: { not: null } }, orderBy: { _count: { areaRaw: "desc" } }, take: 100 }),
    prisma.waitlistSignup.groupBy({ by: ["area"], _count: { _all: true }, where: { area: { not: null } } }),
  ]);

  const counts = new Map(leadCounts.map((c) => [c.areaId, c._count._all]));
  // Texts that did not match any area, from the Pro leads and from the early list.
  const unmatched = new Map<string, { count: number; from: string[] }>();
  const add = (text: string, n: number, from: string) => {
    const e = unmatched.get(text) ?? { count: 0, from: [] };
    e.count += n;
    if (!e.from.includes(from)) e.from.push(from);
    unmatched.set(text, e);
  };
  for (const l of unmatchedLeads) if (l.areaRaw) add(l.areaRaw, l._count._all, "Pro leads");
  for (const w of waitlistAreas) if (w.area && !matchAreaByText(w.area, areas)) add(w.area, w._count._all, "early list");

  return (
    <div className="max-w-6xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Areas</h1>
      <p className="mb-6 max-w-3xl text-text-muted">
        The list of neighbourhoods Servigic knows, with the other names people use for them (aliases). Anything typed in the early list, a sheet or a Pro&apos;s profile is matched against these names, so
        &quot;defence ph 6&quot; becomes DHA. Pins that match no name fall back to the nearest area centre within 3 km.
      </p>
      <AreasClient
        cities={cities.map((c) => ({ id: c.id, name: c.name, countryCode: c.countryCode }))}
        areas={areas.map((a) => ({ id: a.id, cityId: a.cityId, cityName: a.cityName, countryCode: a.countryCode, name: a.name, aliases: a.aliases, lat: a.lat, lng: a.lng, leads: counts.get(a.id) ?? 0 }))}
        unmatched={[...unmatched.entries()].map(([text, v]) => ({ text, count: v.count, from: v.from.join(", ") })).sort((a, b) => b.count - a.count)}
      />
    </div>
  );
}
