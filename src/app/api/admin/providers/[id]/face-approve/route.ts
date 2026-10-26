import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

// An admin looked at the pro (call, documents) and confirms it is really him: clears the review and counts as a pass.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.providerProfile.update({ where: { id }, data: { faceReviewAt: null, faceFailCount: 0, faceVerifiedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
