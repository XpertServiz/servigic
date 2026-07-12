import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const profile = await prisma.providerProfile.update({
    where: { id },
    data: { isOnline: false, isVerified: false, verificationLevel: 0 },
  });

  return NextResponse.json({ profile });
}
