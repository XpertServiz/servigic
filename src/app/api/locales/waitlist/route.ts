import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  countryCode: z.string().length(2),
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const entry = await prisma.countryWaitlistEntry.create({ data: parsed.data });
  return NextResponse.json({ id: entry.id });
}
