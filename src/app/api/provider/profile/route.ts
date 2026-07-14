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
  const { agreementAccepted, cnicUrl, selfieUrl, policeCertUrl, photoQualityOk, ...data } = parsed.data;
  // Only re-derive the geohash when a new location was actually sent —
  // partial submissions (e.g. the KYC screen's docs-only update) must not
  // clobber the existing location with encodeGeohash(undefined, undefined).
  const geohash = data.baseLat !== undefined && data.baseLng !== undefined ? encodeGeohash(data.baseLat, data.baseLng) : undefined;

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: {
      ...data,
      ...(geohash ? { geohash } : {}),
      // "" means "nothing new uploaded" — leave whatever was already saved.
      ...(cnicUrl ? { cnicUrl } : {}),
      // photoQualityOk only ever flips alongside a genuinely new compliant
      // upload (SelfieUploadField always sends both together) — never
      // settable independently of an actual selfieUrl change.
      ...(selfieUrl ? { selfieUrl, photoQualityOk: Boolean(photoQualityOk) } : {}),
      ...(policeCertUrl ? { policeCertUrl } : {}),
      ...(agreementAccepted ? { agreementAcceptedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ profile });
}
