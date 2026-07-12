import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({ isOnline: z.boolean() });

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: { isOnline: parsed.data.isOnline },
  });

  return NextResponse.json({ isOnline: profile.isOnline });
}
