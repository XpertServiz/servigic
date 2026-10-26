import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getMarkets, marketForCity } from "@/lib/marketConfig";
import { ensureAccountCity } from "@/lib/userCountry";

/** Currency of the market a city belongs to (PKR when it is in none). */
export async function getTxCurrencyForCity(city: string | null | undefined): Promise<string> {
  try {
    const market = city ? marketForCity(await getMarkets(), city) : null;
    return market?.currency ?? "PKR";
  } catch {
    return "PKR";
  }
}

/** Currency code of the signed-in user's market. The country the site is used from (IP) decides, same as the apps: a
 * Pakistani number used in Madinah gets SAR. PKR when unknown. */
export async function getTxCurrency(): Promise<string> {
  try {
    const session = await auth();
    if (!session?.user?.id) return "PKR";
    const h = await headers();
    const ipCountry = h.get("x-vercel-ip-country") || h.get("cf-ipcountry");
    const city = ipCountry
      ? await ensureAccountCity(session.user.id, ipCountry)
      : (await prisma.user.findUnique({ where: { id: session.user.id }, select: { city: true } }))?.city;
    const market = city ? marketForCity(await getMarkets(), city) : null;
    return market?.currency ?? "PKR";
  } catch {
    return "PKR";
  }
}
