import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { recomputeProviderStanding } from "@/lib/providerStanding";

const schema = z.object({ ceilingPKR: z.number().int().min(0) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const wallet = await prisma.proWallet.update({ where: { id }, data: { ceilingPKR: parsed.data.ceilingPKR } });
  await recomputeProviderStanding(wallet.providerId);

  return NextResponse.json({ wallet });
}
