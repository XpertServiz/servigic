import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { pendingAgreement } from "@/lib/legal/acceptance";
import { prisma } from "@/lib/prisma";

// Signed-in customer or pro: the agreement still to be accepted (or null), and the latest one already signed.
export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;
  const [pending, signed] = await Promise.all([
    pendingAgreement(auth.session.user.id),
    prisma.termsAcceptance.findFirst({
      where: { userId: auth.session.user.id },
      orderBy: { acceptedAt: "desc" },
      select: { id: true, document: true, version: true, country: true, signedName: true, acceptedAt: true },
    }),
  ]);
  return NextResponse.json({ pending, signed });
}
