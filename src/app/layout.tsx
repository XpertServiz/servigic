import type { Metadata, Viewport } from "next";
import { whatsappDigits } from "@/lib/phone";
import { Suspense } from "react";
import { Cairo, Caveat, Geist_Mono, Noto_Nastaliq_Urdu, Noto_Sans_Devanagari, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { getActiveTheme } from "@/lib/getActiveTheme";
import { RTL_LOCALES, type Locale } from "@/i18n/request";
import { SITE_NAME, SITE_URL, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { Splash } from "@/components/brand/Splash";
import { RouteProgress } from "@/components/brand/RouteProgress";
import { JsonLd } from "@/components/seo/JsonLd";
import { VisitorBeacon } from "@/components/analytics/VisitorBeacon";
import { DemoMoneyProvider } from "@/components/i18n/DemoMoney";
import { PrelaunchShell } from "@/components/prelaunch/PrelaunchShell";
import { getDemoMoney } from "@/lib/money";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { detectVisitorMarket } from "@/lib/geoDetect";
import { localeForCountry } from "@/i18n/locales";
import { prisma } from "@/lib/prisma";
import "./globals.css";

// Same pairing as the OAQS Consultants site: Poppins for everything, Geist Mono for labels/figures.
// Self-hosted by next/font: no layout shift, no third-party font request.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin", "latin-ext"], weight: ["700"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
// Script fallbacks (Poppins has no Arabic/Devanagari glyphs). Only downloaded when a page actually uses those scripts.
// Arabic: Cairo, the clean modern face common in Gulf apps (same as the mobile apps). Urdu: Jameel Noori Nastaleeq when the
// visitor has it installed (most Urdu users on Windows do; it cannot be redistributed), else Noto Nastaliq Urdu.
const notoArabic = Cairo({ variable: "--font-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", preload: false });
const notoUrdu = Noto_Nastaliq_Urdu({ variable: "--font-urdu", subsets: ["arabic"], display: "swap", preload: false });
const notoDevanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.home");
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: { default: t("title"), template: `%s | ${SITE_NAME}` },
    description: t("description"),
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false },
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || "REEG_z0iosDx3CG37GwTXsPKymJPRbvmKr00iIuZOsc",
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, locale, theme, tc] = await Promise.all([getMessages(), getLocale(), getActiveTheme(), getTranslations("common")]);
  const demo = await getDemoMoney(locale);
  // The assistant opens in the language of the visitor's country (Arabic in Saudi Arabia, Urdu in Pakistan), English one tap away.
  const vm = await detectVisitorMarket(locale);
  const chatLang = vm.known ? localeForCountry(vm.country) : (locale as string);
  const supportNumber = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { whatsappSupportNumber: true } }).then((s) => whatsappDigits(s?.whatsappSupportNumber)).catch(() => null);
  const dir = RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme}
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable} ${caveat.variable} ${notoArabic.variable} ${notoUrdu.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Splash tagline={tc("splashTagline")} label={tc("loading")} />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(locale as Locale)]} />
        <NextIntlClientProvider messages={messages}>
          <DemoMoneyProvider value={{ currency: demo.currency, factor: demo.factor }}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <VisitorBeacon />
          <PrelaunchShell>{children}</PrelaunchShell>
          <ChatWidget defaultLang={chatLang} country={vm.country} supportNumber={supportNumber} />
          <Toaster theme="dark" position="top-center" richColors />
          </DemoMoneyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
