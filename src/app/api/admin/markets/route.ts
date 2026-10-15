import { NextResponse } from "next/server";
import { marketSchema } from "@/lib/marketSchema";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { bustMarketCache } from "@/lib/marketConfig";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = marketSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const market = await prisma.market.create({ data: parsed.data });
    bustMarketCache();
    return NextResponse.json({ market });
  } catch {
    return NextResponse.json({ error: "A market with that country and name already exists." }, { status: 409 });
  }
}
