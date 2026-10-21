import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { seedAreas } from "@/lib/areaSeed";
import { loadResolutionContext, resolveLocation } from "@/lib/areas";

const upsertSchema = z.object({
  id: z.string().optional(),
  cityId: z.string().optional(),
  newCity: z.object({ countryCode: z.string().length(2), name: z.string().trim().min(1).max(60) }).optional(),
  name: z.string().trim().min(1).max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  status: z.enum(["hidden", "waitlist", "live"]).default("waitlist"),
});

/** After an alias or area changes, leads that had no area get another chance to match. */
async function rematchLeads() {
  const ctx = await loadResolutionContext();
  const open = await prisma.lead.findMany({ where: { areaId: null, OR: [{ areaRaw: { not: null } }, { addressText: { not: null } }] }, take: 5000 });
  let matched = 0;
  for (const l of open) {
    const loc = resolveLocation({ text: l.areaRaw ?? l.addressText, lat: l.lat, lng: l.lng, cityName: l.city }, ctx.areas, ctx.markets);
    if (loc.areaId) {
      const area = ctx.areas.find((a) => a.id === loc.areaId)!;
      await prisma.lead.update({ where: { id: l.id }, data: { areaId: loc.areaId, cityId: loc.cityId, zoneId: l.zoneId ?? loc.zoneId, areaLabel: area.name, lat: l.lat ?? area.lat, lng: l.lng ?? area.lng } });
      matched++;
    }
  }
  return matched;
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { action?: string } | null;

  if (body?.action === "seed") {
    const r = await seedAreas();
    return NextResponse.json({ ok: true, ...r, rematched: await rematchLeads() });
  }
  // "Assign unmatched": put a free-text area on an existing area, optionally remembering the text as an alias.
  if (body?.action === "assign") {
    const p = z.object({ text: z.string().min(1), areaId: z.string(), saveAlias: z.boolean().default(true) }).safeParse(body);
    if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const area = await prisma.area.findUnique({ where: { id: p.data.areaId } });
    if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 });
    if (p.data.saveAlias && !area.aliases.some((a) => a.toLowerCase() === p.data.text.trim().toLowerCase())) {
      await prisma.area.update({ where: { id: area.id }, data: { aliases: [...area.aliases, p.data.text.trim()] } });
    }
    return NextResponse.json({ ok: true, rematched: await rematchLeads() });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  let cityId = d.cityId;
  if (!cityId && d.newCity) {
    const c = await prisma.city.upsert({ where: { countryCode_name: { countryCode: d.newCity.countryCode.toUpperCase(), name: d.newCity.name } }, update: {}, create: { countryCode: d.newCity.countryCode.toUpperCase(), name: d.newCity.name } });
    cityId = c.id;
  }
  const aliases = Array.from(new Set(d.aliases));
  if (d.id) {
    await prisma.area.update({ where: { id: d.id }, data: { name: d.name, aliases, lat: d.lat ?? null, lng: d.lng ?? null, status: d.status } });
  } else {
    if (!cityId) return NextResponse.json({ error: "Choose a city." }, { status: 400 });
    await prisma.area.create({ data: { cityId, name: d.name, aliases, lat: d.lat ?? null, lng: d.lng ?? null, status: d.status } });
  }
  return NextResponse.json({ ok: true, rematched: await rematchLeads() });
}

export async function DELETE(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await prisma.area.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
