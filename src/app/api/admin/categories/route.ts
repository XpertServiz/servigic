import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { TRADES } from "@/lib/validation/provider";

const createSchema = z.object({
  trade: z.enum(TRADES),
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(60),
  icon: z.string().trim().min(1).max(8),
  description: z.string().trim().max(300).optional(),
  minPricePKR: z.number().int().min(0).optional(),
  maxPricePKR: z.number().int().min(0).optional(),
  activeCities: z.array(z.string()).default([]),
});

export async function GET() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    include: { subServices: true },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const category = await prisma.serviceCategory.create({ data: parsed.data });
  return NextResponse.json({ category });
}
