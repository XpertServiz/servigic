import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { setCountryState } from "@/lib/marketSync";

const schema = z.object({
  language: z.enum(["en", "ur", "ar", "de", "fr", "pl"]),
  direction: z.enum(["ltr", "rtl"]),
  currency: z.enum(["PKR", "USD", "CAD", "EUR", "PLN", "SAR", "AED", "QAR"]),
  paymentMethodsShown: z.array(z.string()),
  legalDisclaimer: z.string().max(2000),
  isLive: z.boolean(),
  citiesLive: z.array(z.string()),
});

export async function PUT(req: Request, { params }: { params: Promise<{ countryCode: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { countryCode } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const config = await prisma.localeConfig.update({ where: { countryCode }, data: parsed.data });
  revalidateTag("locale-configs", "max");
  // Keep Markets & Launch in step: Live here means the country's markets are live; not live means waitlist (when it has markets).
  const hasMarkets = (await prisma.market.count({ where: { countryCode } })) > 0;
  if (parsed.data.isLive || hasMarkets) await setCountryState(countryCode, parsed.data.isLive ? "live" : "waitlist", { cities: parsed.data.citiesLive });

  return NextResponse.json({ config });
}
