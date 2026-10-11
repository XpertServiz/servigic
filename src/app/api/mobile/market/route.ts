import { NextResponse } from "next/server";
import { detectMarket } from "@/lib/geoDetect";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/i18n/request";

// Public (called before login, on first launch): tells the mobile app which
// language to *suggest*. Same geo-header detection the web landing page uses
// (Vercel's x-vercel-ip-country), so there's no third-party IP lookup and no
// extra privacy surface. The app only ever suggests — it never switches
// languages silently.
export async function GET() {
  const market = await detectMarket();
  const suggestedLocale = SUPPORTED_LOCALES.includes(market.suggestedLocale) ? market.suggestedLocale : DEFAULT_LOCALE;
  return NextResponse.json({
    country: market.country,
    countryName: market.countryName,
    suggestedLocale,
  });
}
