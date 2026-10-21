import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMarkets, marketForCity } from "@/lib/marketConfig";

/** Currency of the market a city belongs to (PKR when it is in none). */
export async function getTxCurrencyForCity(city: string | null | undefined): Promise<string> {
  try {
    const market = city ? marketForCity(await getMarkets(), city) : null;
    return market?.currency ?? "PKR";
  } catch {
    return "PKR";
  }
}

/** Currency code of the signed-in user's market (by their city); PKR when unknown. */
export async function getTxCurrency(): Promise<string> {
  try {
    const session = await auth();
    if (!session?.user?.id) return "PKR";
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { city: true } });
    const market = user?.city ? marketForCity(await getMarkets(), user.city) : null;
    return market?.currency ?? "PKR";
  } catch {
    return "PKR";
  }
}
