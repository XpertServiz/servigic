import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { providerProfileSchema } from "@/lib/validation/provider";
import { encodeGeohash } from "@/lib/geo";
import { getMarkets, marketForCity } from "@/lib/marketConfig";
import { evaluateProActivation } from "@/lib/proActivation";

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
  const { agreementAccepted, cnicUrl, selfieUrl, policeCertUrl, photoQualityOk, photoConsentPublic, cnicOcr, ...data } = parsed.data;
  // Market config (handoff section 11.6): a pro can only choose trades that are switched on in their market.
  if (data.trades) {
    const [markets, me] = await Promise.all([getMarkets(), prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { city: true } })]);
    const market = marketForCity(markets, me?.city);
    if (markets.length > 0 && market) {
      const blocked = data.trades.filter((t) => !market.trades[t]?.enabled);
      if (blocked.length > 0) {
        return NextResponse.json(
          { error: "Some of these trades are not available in your area yet.", code: "TRADE_NOT_AVAILABLE", trades: blocked },
          { status: 422 }
        );
      }
    }
  }

  // Only re-derive the geohash when a new location was actually sent —
  // partial submissions (e.g. the KYC screen's docs-only update) must not
  // clobber the existing location with encodeGeohash(undefined, undefined).
  const geohash = data.baseLat !== undefined && data.baseLng !== undefined ? encodeGeohash(data.baseLat, data.baseLng) : undefined;

  // A complete CNIC + selfie submission (re)starts the verification review:
  // it stamps the SLA clock and clears any earlier rejection. Only counts when
  // new documents actually arrived with this request.
  const existing = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  const newDocsSent = Boolean(cnicUrl || selfieUrl);
  const hasBothDocs = Boolean(cnicUrl || existing?.cnicUrl) && Boolean(selfieUrl || existing?.selfieUrl);
  const submittedForReview = newDocsSent && hasBothDocs && !existing?.isVerified;

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: {
      ...data,
      ...(cnicOcr ? { cnicOcr } : {}),
      ...(submittedForReview
        ? {
            verificationSubmittedAt: new Date(),
            verificationEscalatedAt: null,
            verificationRejectedAt: null,
            verificationRejectedReason: null,
          }
        : {}),
      ...(geohash ? { geohash } : {}),
      // "" means "nothing new uploaded" — leave whatever was already saved.
      ...(cnicUrl ? { cnicUrl } : {}),
      // photoQualityOk only ever flips alongside a genuinely new compliant
      // upload (SelfieUploadField always sends both together) — never
      // settable independently of an actual selfieUrl change.
      ...(selfieUrl ? { selfieUrl, photoQualityOk: Boolean(photoQualityOk) } : {}),
      ...(policeCertUrl ? { policeCertUrl } : {}),
      ...(agreementAccepted ? { agreementAcceptedAt: new Date() } : {}),
      // Consent can be toggled either way; only stamp a new timestamp when it
      // actually flips on — turning it off keeps the original consent record.
      ...(photoConsentPublic !== undefined
        ? { photoConsentPublic, ...(photoConsentPublic ? { photoConsentAt: new Date() } : {}) }
        : {}),
    },
  });

  // A trade change can move a pro between ACTIVE and WAITING (market cap / trade switched off).
  if (data.trades) await evaluateProActivation(profile.id).catch((e) => console.error("[activation]", e));

  return NextResponse.json({ profile });
}
