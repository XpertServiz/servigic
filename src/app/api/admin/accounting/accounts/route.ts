import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const createSchema = z.object({
  code: z.string().trim().min(2).max(10),
  name: z.string().trim().min(2).max(100),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const accounts = await prisma.account.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.account.findUnique({ where: { code: parsed.data.code } });
  if (existing) return NextResponse.json({ error: "An account with this code already exists" }, { status: 409 });

  const account = await prisma.account.create({ data: parsed.data });
  return NextResponse.json({ account });
}
