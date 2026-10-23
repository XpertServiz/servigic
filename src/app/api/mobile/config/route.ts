import { NextResponse } from "next/server";
import { whatsappDigits } from "@/lib/phone";
import { headers } from "next/headers";
import { acceptsJobs, getMarkets, marketForCity, marketForCountry, marketForPoint } from "@/lib/marketConfig";
import { prisma } from "@/lib/prisma";
import { walletLimitsForMarket } from "@/lib/walletLimits";

// Admin-controlled things every app reads at start-up: an announcement banner, the oldest app version still allowed,
// where to update, and the support WhatsApp number (Admin > Settings). Changing them never needs an app release.
async function appControls() {
  const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const title = s?.announcementTitle?.trim();
  const body = s?.announcementBody?.trim();
  return {
    announcement: s?.announcementActive && (title || body) ? { title: title ?? "", body: body ?? "", audience: s.announcementAudience } : null,
    minVersionCode: s?.minAndroidVersionCode ?? 0,
    storeUrls: { pro: s?.storeUrlPro ?? null, customer: s?.storeUrlCustomer ?? null },
    supportWhatsapp: whatsappDigits(s?.whatsappSupportNumber),
    minTopUpPKR: s?.minTopUpPKR ?? 500,
  };
}

// Public, called at app startup (before login) and again once the user's city is known.
// Tells the app which market the user is in and which categories are switched on there, so
// disabled categories are hidden / shown as "Coming soon" and an out-of-area user sees the
// waitlist screen (handoff §11.6). Cached by the apps; short private cache here.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = url.searchParams.get("city");
  // The customer's GPS position or job pin: with it, the drawn zone geofence decides (not the city name).
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const hasPoint = url.searchParams.has("lat") && url.searchParams.has("lng") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const headerList = await headers();
  const geoCountry = (headerList.get("x-vercel-ip-country") || headerList.get("cf-ipcountry") || "").toUpperCase() || null;

  const [markets, app] = await Promise.all([getMarkets(), appControls()]);
  // No market config at all (table empty / unreachable): behave as before, everything is open.
  if (markets.length === 0) return NextResponse.json({ legacyOpen: true, country: geoCountry, market: null, acceptingJobs: true, trades: {}, app });

  // A known city decides the market on its own (a city that is in no market is "outside the area");
  // only when the app does not know the city yet (first launch, before signup) do we guess from the IP country.
  const market = hasPoint ? marketForPoint(markets, { lat, lng }, city) : city ? marketForCity(markets, city) : marketForCountry(markets, geoCountry);
  const accepting = acceptsJobs(market);
  // The smallest wallet top-up in the user's own market and currency.
  app.minTopUpPKR = (await walletLimitsForMarket(market)).minTopUp;
  return NextResponse.json(
    {
      legacyOpen: false,
      country: market?.countryCode ?? geoCountry,
      market: market ? { id: market.id, name: market.name, status: market.status, cities: market.cities, currency: market.currency, phoneCode: market.phoneCode, timezone: market.timezone } : null,
      acceptingJobs: accepting,
      // trade -> enabled (only meaningful when acceptingJobs)
      trades: market ? Object.fromEntries(Object.entries(market.trades).map(([t, v]) => [t, v.enabled])) : {},
      app,
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
