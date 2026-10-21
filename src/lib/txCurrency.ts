import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMarkets, marketForCity } from "@/lib/marketConfig";

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
