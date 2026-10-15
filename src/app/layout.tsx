import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist_Mono, Noto_Nastaliq_Urdu, Noto_Sans_Arabic, Noto_Sans_Devanagari, Poppins } from "next/font/google";
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
import "./globals.css";

// Same pairing as the OAQS Consultants site: Poppins for everything, Geist Mono for labels/figures.
// Self-hosted by next/font: no layout shift, no third-party font request.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
// Script fallbacks (Poppins has no Arabic/Devanagari glyphs). Only downloaded when a page actually uses those scripts.
const notoArabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"], display: "swap", preload: false });
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
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
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
  const dir = RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme}
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable} ${notoArabic.variable} ${notoUrdu.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Splash tagline={tc("splashTagline")} label={tc("loading")} />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(locale as Locale)]} />
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <VisitorBeacon />
          {children}
          <Toaster theme="dark" position="top-center" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
