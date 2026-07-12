import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { providerProfileSchema } from "@/lib/validation/provider";
import { encodeGeohash } from "@/lib/geo";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = providerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { agreementAccepted, ...data } = parsed.data;
  const geohash = encodeGeohash(data.baseLat, data.baseLng);

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: {
      ...data,
      geohash,
      ...(agreementAccepted ? { agreementAcceptedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ profile });
}
