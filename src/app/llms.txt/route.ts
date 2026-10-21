import { SERVICE_CATALOG } from "@/lib/catalog";
import { getCitySlugs } from "@/lib/liveCities";
import { prisma } from "@/lib/prisma";
import { LOCALES } from "@/i18n/locales";
import { SITE_URL } from "@/lib/seo";

// A plain-language summary for AI assistants and answer engines (llms.txt convention).
export const revalidate = 86400;

export async function GET() {
  const cities = await getCitySlugs();
  const first = cities[0]?.slug ?? "karachi";
  const live = await prisma.localeConfig.findMany({ where: { isLive: true }, select: { countryName: true } }).catch(() => []);
  const countries = live.map((c) => c.countryName).join(", ") || "Pakistan";
  const services = SERVICE_CATALOG.map((s) => `- ${s.trade.replace(/_/g, " ").toLowerCase()}: ${SITE_URL}/services/${s.slug}/${first}`).join("\n");
  const body = `# Servigic

> Servigic is a home-services marketplace operating in ${countries}. A customer posts a job (with photos and an area), verified local pros bid on it within minutes, the customer compares price, rating and ETA, picks a pro and pays that pro directly once the work is done. Pros pay no lead fees, only a 10-12% commission on jobs they win.

## Key facts
- Cities: ${cities.map((c) => c.name).join(", ")} (more cities and countries planned)
- Trades: 12 (plumbers, electricians, AC technicians, solar installers, carpenters, painters, appliance repair, car mechanics, movers, cleaners, masons, handymen)
- Pros are verified: government ID + selfie (Level 1), police clearance (Level 2), proven track record (Level 3 "Gold Ustad")
- Customers never pay Servigic upfront; contact details are masked until the pro is on the way; disputes are mediated by the Servigic team
- The website is available in ${LOCALES.map((l) => l.english).join(", ")}

## Pages
- Home: ${SITE_URL}/
- How it works: ${SITE_URL}/how-it-works
- All services: ${SITE_URL}/services
- Become a pro: ${SITE_URL}/pro
- Trust and safety: ${SITE_URL}/trust-and-safety
- Servigic for Business (property managers): ${SITE_URL}/business

## Services (examples; each trade exists in every live city)
${services}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
