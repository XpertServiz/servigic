import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const BOOST_DURATION_MS = 60 * 60 * 1000;

// Called by the Pro app after the user opts in and finishes a rewarded ad.
// The reward is trusted from the client (AdMob server-side verification needs
// a callback URL configured in the AdMob console), so the grant is
// deliberately low-stakes: it can't stack — an active boost is returned
// as-is rather than extended — so abuse is capped at one hour at a time.
export async function POST() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  if (profile.visibilityBoostUntil && profile.visibilityBoostUntil.getTime() > Date.now()) {
    return NextResponse.json({ boostedUntil: profile.visibilityBoostUntil, alreadyActive: true });
  }

  const boostedUntil = new Date(Date.now() + BOOST_DURATION_MS);
  await prisma.providerProfile.update({ where: { id: profile.id }, data: { visibilityBoostUntil: boostedUntil } });
  return NextResponse.json({ boostedUntil, alreadyActive: false });
}
