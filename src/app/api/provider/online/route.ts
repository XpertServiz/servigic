import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { faceBlock } from "@/lib/faceCheck";

const schema = z.object({ isOnline: z.boolean() });

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.isOnline) {
    const current = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { faceVerifiedAt: true, faceReviewAt: true } });
    const block = current ? await faceBlock(auth.session.user.id, current) : null;
    if (block) return NextResponse.json({ error: block.message, code: block.code }, { status: 403 });
  }

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: { isOnline: parsed.data.isOnline, ...(parsed.data.isOnline ? {} : { liveLat: null, liveLng: null, liveAt: null }) },
  });

  return NextResponse.json({ isOnline: profile.isOnline });
}
