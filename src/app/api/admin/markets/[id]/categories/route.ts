import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { bustMarketCache } from "@/lib/marketConfig";
import { activateWaitingForMarket } from "@/lib/proActivation";
import { notifyWaitlistForMarket } from "@/lib/waitlistNotify";
import { Trade } from "@prisma/client";

// The country x category matrix for one market: which trades are switched on, and the optional
// cap on ACTIVE pros per trade (handoff §11.4 / §11.6).
const schema = z.object({
  categories: z.array(
    z.object({
      trade: z.nativeEnum(Trade),
      enabled: z.boolean(),
      maxActivePros: z.number().int().min(0).max(100000).nullable(),
      targetPros: z.number().int().min(0).max(100000).optional(),
    }),
  ),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const market = await prisma.market.findUnique({ where: { id }, select: { id: true } });
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });

  await prisma.$transaction(
    parsed.data.categories.map((c) =>
      prisma.marketCategory.upsert({
        where: { marketId_trade: { marketId: id, trade: c.trade } },
        update: { enabled: c.enabled, maxActivePros: c.maxActivePros, ...(c.targetPros != null ? { targetPros: c.targetPros } : {}) },
        create: { marketId: id, trade: c.trade, enabled: c.enabled, maxActivePros: c.maxActivePros, ...(c.targetPros != null ? { targetPros: c.targetPros } : {}) },
      }),
    ),
  );
  bustMarketCache();
  const activated = await activateWaitingForMarket(id).catch(() => 0);
  // A service switched on in this zone: tell the people who were waiting for exactly that service.
  const notified = await notifyWaitlistForMarket(id).catch(() => 0);
  return NextResponse.json({ ok: true, activated, notified });
}
