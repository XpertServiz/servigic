import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { bustMarketCache } from "@/lib/marketConfig";
import { activateWaitingForMarket } from "@/lib/proActivation";
import { marketSchema } from "@/lib/marketSchema";
import { notifyWaitlistForMarket } from "@/lib/waitlistNotify";
import { Prisma } from "@prisma/client";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const parsed = marketSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const { polygons, ...rest } = parsed.data;
    const market = await prisma.market.update({
      where: { id },
      data: { ...rest, ...(polygons !== undefined ? { polygons: polygons.length ? polygons : Prisma.DbNull } : {}) },
    });
    bustMarketCache();
    // Opening a market (or changing its cities/status) can free up waiting pros; the cache bust above
    // only reaches this instance, so the activation pass reads the DB state directly via a fresh snapshot.
    const activated = await activateWaitingForMarket(id).catch(() => 0);
    // Customers who asked to be told when this zone opens hear about it now (once each).
    const notified = await notifyWaitlistForMarket(id).catch(() => 0);
    return NextResponse.json({ market, activated, notified });
  } catch {
    return NextResponse.json({ error: "Could not save (duplicate country + name?)" }, { status: 409 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.market.delete({ where: { id } }).catch(() => null);
  bustMarketCache();
  return NextResponse.json({ ok: true });
}
