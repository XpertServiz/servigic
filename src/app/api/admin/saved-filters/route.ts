import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({ resource: z.enum(["leads", "pros", "waitlist"]), name: z.string().trim().min(1).max(60), filter: z.record(z.string(), z.string()) });

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give the preset a name." }, { status: 400 });
  const row = await prisma.savedFilter.create({ data: { adminId: auth.session.user.id, ...parsed.data } });
  return NextResponse.json({ preset: row });
}

export async function DELETE(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await prisma.savedFilter.deleteMany({ where: { id, adminId: auth.session.user.id } });
  return NextResponse.json({ ok: true });
}
