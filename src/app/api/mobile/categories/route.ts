import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { acceptsJobs, getMarkets, resolveMarket, tradeEnabled } from "@/lib/marketConfig";

export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const [categories, user, markets] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" }, include: { subServices: { where: { active: true } } } }),
    prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { city: true } }),
    getMarkets(),
  ]);

  // Market config (handoff §11.6): each category says whether it is switched on in the user's
  // market. The apps hide unavailable ones or show them as "Coming soon" with a waitlist. With no
  // market config at all, everything stays available (legacy behaviour).
  const geo = ((await headers()).get("x-vercel-ip-country") || "").toUpperCase() || null;
  const market = resolveMarket(markets, user?.city, geo);
  const legacyOpen = markets.length === 0;
  const accepting = legacyOpen || acceptsJobs(market);

  return NextResponse.json({
    categories: categories.map((c) => ({ ...c, available: legacyOpen || (accepting && tradeEnabled(market, c.trade)) })),
    acceptingJobs: accepting,
    market: market ? { id: market.id, name: market.name, status: market.status } : null,
  });
}
