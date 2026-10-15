import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { TRADES } from "@/lib/validation/provider";

// A pro uploads the certificate / photo an admin asked for, for one pending trade.
const schema = z.object({ trade: z.enum(TRADES), url: z.string().url() });

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 404 });

  const res = await prisma.providerTrade.updateMany({
    where: { providerId: profile.id, trade: parsed.data.trade, status: "PENDING" },
    data: { certificateUrl: parsed.data.url },
  });
  if (res.count !== 1) return NextResponse.json({ error: "There is no pending request for that trade" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
