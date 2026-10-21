import { NextResponse } from "next/server";
import { marketSchema } from "@/lib/marketSchema";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { bustMarketCache } from "@/lib/marketConfig";
import { notifyWaitlistForMarket } from "@/lib/waitlistNotify";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = marketSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const { polygons, launchDate, ...rest } = parsed.data;
    const market = await prisma.market.create({ data: { ...rest, launchDate: launchDate ? new Date(launchDate) : null, polygons: polygons?.length ? polygons : Prisma.DbNull } });
    bustMarketCache();
    const notified = await notifyWaitlistForMarket(market.id).catch(() => 0);
    return NextResponse.json({ market, notified });
  } catch {
    return NextResponse.json({ error: "A market with that country and name already exists." }, { status: 409 });
  }
}
