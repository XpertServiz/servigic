import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(60),
  minPricePKR: z.number().int().min(0).optional(),
  maxPricePKR: z.number().int().min(0).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const subService = await prisma.subService.create({ data: { ...parsed.data, categoryId: id } });
  return NextResponse.json({ subService });
}
