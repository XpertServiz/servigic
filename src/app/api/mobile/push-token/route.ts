import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({ token: z.string().trim().startsWith("ExponentPushToken") });

export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid push token" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { fcmTokens: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!user.fcmTokens.includes(parsed.data.token)) {
    await prisma.user.update({
      where: { id: auth.session.user.id },
      data: { fcmTokens: { push: parsed.data.token } },
    });
  }

  return NextResponse.json({ ok: true });
}
