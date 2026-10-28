import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { providerProfileSchema } from "@/lib/validation/provider";
import { encodeGeohash } from "@/lib/geo";
import { getMarkets, marketForCity, nearestMarketCity } from "@/lib/marketConfig";
import { evaluateProActivation } from "@/lib/proActivation";
import { listTradeRequests, requestTradeSelection } from "@/lib/providerTrades";
import { notify } from "@/lib/notify";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  return NextResponse.json({ profile, tradeRequests: profile ? await listTradeRequests(profile.id) : [] });
}

export async function PUT(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = providerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { agreementAccepted, cnicUrl, selfieUrl, policeCertUrl, photoQualityOk, photoConsentPublic, cnicOcr, trades: requestedTrades, ...data } = parsed.data;
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const radiusMin = settings?.proRadiusMinKm ?? 2;
  const userCity = (await prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { city: true } }))?.city;
  const radiusMax = (userCity ? marketForCity(await getMarkets(), userCity)?.proRadiusMaxKm : null) ?? settings?.proRadiusMaxKm ?? 30;
  if (data.serviceRadiusKm !== undefined && (data.serviceRadiusKm < radiusMin || data.serviceRadiusKm > radiusMax)) {
    return NextResponse.json({ error: `Service radius must be between ${radiusMin} and ${radiusMax} km.`, code: "RADIUS_OUT_OF_RANGE" }, { status: 400 });
  }
  // Market config (handoff section 11.6): a pro can only choose trades that are switched on in their market.
  if (requestedTrades) {
    const [markets, me] = await Promise.all([getMarkets(), prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { city: true } })]);
    const market = marketForCity(markets, me?.city);
    if (markets.length > 0 && market) {
      const blocked = requestedTrades.filter((t) => !market.trades[t]?.enabled);
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

  // The pro's city follows his work location: a pin in Madinah makes him a Madinah pro, whatever city the account had.
  if (data.baseLat !== undefined && data.baseLng !== undefined && data.baseLat !== null && data.baseLng !== null) {
    const near = nearestMarketCity(await getMarkets(), { lat: data.baseLat, lng: data.baseLng });
    if (near) await prisma.user.update({ where: { id: auth.session.user.id }, data: { city: near.city } }).catch(() => null);
  }

  const photoChanged = Boolean((cnicUrl && cnicUrl !== existing?.cnicUrl) || (selfieUrl && selfieUrl !== existing?.selfieUrl));
  const swappedWhileVerified = photoChanged && Boolean(existing?.isVerified) && Boolean(existing?.cnicUrl || existing?.selfieUrl);

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: {
      ...data,
      ...(photoChanged ? { faceVerifiedAt: null, faceFailCount: 0, faceReviewAt: swappedWhileVerified ? new Date() : null } : {}),
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

  // Trades are requests: each new one waits for an admin to approve it (max per pro is an admin setting).
  if (requestedTrades) {
    const result = await requestTradeSelection(profile.id, requestedTrades, settings?.maxTradesPerPro ?? 3);
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: 422 });
    // An already-approved pro asking for another skill: tell the admins, so it does not sit unseen (Admin > Trade approvals).
    if (result.pending.length > 0 && profile.trades.length > 0) {
      const pretty = result.pending.map((t) => t.replace(/_/g, " ").toLowerCase()).join(", ");
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.allSettled(
        admins.map((a) =>
          notify({
            userId: a.id,
            type: "SYSTEM",
            title: "New skill to approve",
            body: `${profile.displayName ?? "A pro"} asked to add: ${pretty}.`,
            linkUrl: "/admin/trades",
            channels: ["email"],
          })
        )
      );
    }
    // Removing a trade can move a pro between ACTIVE and WAITING (market cap / trade switched off).
    await evaluateProActivation(profile.id).catch((e) => console.error("[activation]", e));
  }

  const fresh = await prisma.providerProfile.findUnique({ where: { id: profile.id } });
  return NextResponse.json({ profile: fresh ?? profile, tradeRequests: await listTradeRequests(profile.id) });
}
