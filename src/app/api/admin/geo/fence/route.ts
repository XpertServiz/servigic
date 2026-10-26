import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getLeadPlaces } from "@/lib/leadPlaces";

// Geofence by ticking areas instead of drawing: each picked area (district, neighbourhood or road) is looked up on
// OpenStreetMap (Nominatim, free) and turned into a polygon - the area's real boundary when OSM has one, otherwise a
// small box around the road or a 1.2 km circle around the place. Boundaries found are remembered in Admin > Areas
// (when the city is there) so the next lookup is instant. Nominatim allows about one request per second.
export const maxDuration = 60;

type Ring = [number, number][];
const schema = z.object({ country: z.string().trim().min(2), city: z.string().trim().min(2), areas: z.array(z.string().trim().min(2).max(80)).min(1).max(40) });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every Nth point, so a detailed boundary stays light (at most ~80 corners). */
function thin(ring: Ring): Ring {
  const step = Math.ceil(ring.length / 80);
  return step <= 1 ? ring : ring.filter((_, i) => i % step === 0);
}

function circle(lat: number, lng: number, km: number): Ring {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * 2 * Math.PI;
    return [+(lat + dLat * Math.sin(a)).toFixed(6), +(lng + dLng * Math.cos(a)).toFixed(6)] as [number, number];
  });
}

type NominatimHit = { lat: string; lon: string; boundingbox: [string, string, string, string]; geojson?: { type: string; coordinates: unknown } };

function ringsOf(hit: NominatimHit): Ring[] {
  const g = hit.geojson;
  const toRing = (coords: [number, number][]): Ring => thin(coords.map(([lng, lat]) => [+lat.toFixed(6), +lng.toFixed(6)] as [number, number]));
  if (g?.type === "Polygon") return [toRing((g.coordinates as [number, number][][])[0])];
  if (g?.type === "MultiPolygon") return (g.coordinates as [number, number][][][]).map((p) => toRing(p[0]));
  const [s, n, w, e] = hit.boundingbox.map(Number);
  // A road: its bounding box with a little margin. A single point: a circle.
  if (g?.type === "LineString" || g?.type === "MultiLineString") {
    const pad = 0.003;
    return [[[s - pad, w - pad], [s - pad, e + pad], [n + pad, e + pad], [n + pad, w - pad]]];
  }
  return [circle(Number(hit.lat), Number(hit.lon), 1.2)];
}

async function lookup(area: string, city: string, country: string): Promise<Ring[] | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${area}, ${city}, ${country}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("polygon_threshold", "0.0005");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { "User-Agent": "Servigic admin geofence (https://servigic.com)", "Accept-Language": "en" } });
  if (!res.ok) return null;
  const hits = (await res.json()) as NominatimHit[];
  return hits[0] ? ringsOf(hits[0]) : null;
}

/** GET: the area names known for a city (starter list + Admin > Areas), for the checkbox list. */
export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("country") ?? "").toUpperCase();
  const places = await getLeadPlaces();
  const country = places.find((c) => c.code === code);
  return NextResponse.json({ country: country?.name ?? code, cities: country?.cities ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pick a city and at least one area (40 at most at a time)." }, { status: 400 });
  const { country, city, areas } = parsed.data;

  const cityRow = await prisma.city.findFirst({ where: { name: { equals: city, mode: "insensitive" } }, include: { areas: true } });
  const rings: Ring[] = [];
  const notFound: string[] = [];
  let calls = 0;
  for (const name of areas) {
    const known = cityRow?.areas.find((a) => a.name.toLowerCase() === name.toLowerCase() && Array.isArray(a.polygon));
    if (known) {
      rings.push(...(known.polygon as unknown as Ring[]));
      continue;
    }
    if (calls++ > 0) await sleep(1100);
    const found = await lookup(name, city, country).catch(() => null);
    if (!found?.length) {
      notFound.push(name);
      continue;
    }
    rings.push(...found);
    if (cityRow) {
      const pts = found[0];
      const lat = +(pts.reduce((t, p) => t + p[0], 0) / pts.length).toFixed(6);
      const lng = +(pts.reduce((t, p) => t + p[1], 0) / pts.length).toFixed(6);
      await prisma.area
        .upsert({
          where: { cityId_name: { cityId: cityRow.id, name } },
          update: { polygon: found },
          create: { cityId: cityRow.id, name, aliases: [name], lat, lng, polygon: found },
        })
        .catch(() => {});
    }
  }
  return NextResponse.json({ rings, notFound });
}
