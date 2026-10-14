import { CITY_SLUGS, SERVICE_CATALOG } from "@/lib/catalog";
import { LOCALES } from "@/i18n/locales";
import { SITE_URL } from "@/lib/seo";

// A plain-language summary for AI assistants and answer engines (llms.txt convention).
export const revalidate = 86400;

export function GET() {
  const services = SERVICE_CATALOG.map((s) => `- ${s.trade.replace(/_/g, " ").toLowerCase()}: ${SITE_URL}/services/${s.slug}/karachi`).join("\n");
  const body = `# Servigic

> Servigic is a home-services marketplace for Pakistan. A customer posts a job (with photos and an area), verified local pros bid on it within minutes, the customer compares price, rating and ETA, picks a pro and pays that pro directly once the work is done. Pros pay no lead fees, only a 10-12% commission on jobs they win.

## Key facts
- Cities: ${CITY_SLUGS.map((c) => c.name).join(", ")} (more GCC and North American cities planned)
- Trades: 12 (plumbers, electricians, AC technicians, solar installers, carpenters, painters, appliance repair, car mechanics, movers, cleaners, masons, handymen)
- Pros are verified: CNIC + selfie (Level 1), police verification (Level 2), proven track record (Level 3 "Gold Ustad")
- Customers never pay Servigic upfront; contact details are masked until the pro is on the way; every job has 7-day workmanship support
- The website is available in ${LOCALES.map((l) => l.english).join(", ")}

## Pages
- Home: ${SITE_URL}/
- How it works: ${SITE_URL}/how-it-works
- All services: ${SITE_URL}/services
- Become a pro: ${SITE_URL}/pro
- Trust and safety: ${SITE_URL}/trust-and-safety
- Servigic for Business (property managers): ${SITE_URL}/business

## Services (Karachi examples; each trade also exists for Lahore, Islamabad, Rawalpindi)
${services}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
