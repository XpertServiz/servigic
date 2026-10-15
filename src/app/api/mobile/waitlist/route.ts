import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { getMarkets, marketForCity, marketForPoint } from "@/lib/marketConfig";
import { Trade } from "@prisma/client";

// "Notify me" capture for the apps (handoff §11.2/§11.6): either outside a launch area, or for a
// category that is still "Coming soon". Works signed in (uses the account) or signed out (email/phone).
const schema = z.object({
  trade: z.nativeEnum(Trade).optional(),
  city: z.string().trim().max(60).optional(),
  countryCode: z.string().length(2).optional(),
  role: z.enum(["CUSTOMER", "PROVIDER"]).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(24).optional(),
  name: z.string().trim().max(120).optional(),
  // Where they were (GPS or job pin) and a readable area name, so the admin sees demand by area.
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  area: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const input = parsed.data;

  // Signed-in callers: take identity from the account, not from the body.
  const headerList = await headers();
  let userId: string | undefined;
  const authHeader = headerList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = await verifyMobileToken(authHeader.slice(7));
    if (payload) userId = payload.id;
  } else {
    userId = (await auth())?.user?.id;
  }
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, city: true, role: true } })
    : null;

  const email = user?.email ?? input.email;
  const phone = user?.phone ?? input.phone;
  if (!email && !phone) return NextResponse.json({ error: "Enter an email or phone number so we can notify you." }, { status: 400 });

  const city = input.city ?? user?.city ?? undefined;
  const markets = await getMarkets();
  const market = input.lat != null && input.lng != null ? marketForPoint(markets, { lat: input.lat, lng: input.lng }, city) : marketForCity(markets, city);
  const geo = headerList.get("x-vercel-ip-country")?.toUpperCase();
  const countryCode = market?.countryCode ?? input.countryCode?.toUpperCase() ?? geo ?? "XX";

  // One entry per person + trade + country: tapping "notify me" again is a no-op.
  const existing = await prisma.countryWaitlistEntry.findFirst({
    where: { countryCode, trade: input.trade ?? null, OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    select: { id: true },
  });
  if (!existing) {
    await prisma.countryWaitlistEntry.create({
      data: {
        countryCode,
        email,
        phone,
        name: user?.name ?? input.name,
        city,
        zone: market?.name,
        lat: input.lat,
        lng: input.lng,
        area: input.area,
        marketId: market?.id,
        trade: input.trade,
        role: user?.role === "PROVIDER" || input.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
        userId: user?.id,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
