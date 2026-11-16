import { headers } from "next/headers";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getLiveCities, getCountryCities } from "@/lib/liveCities";
import { whatsappDigits } from "@/lib/phone";
import { detectMarket } from "@/lib/geoDetect";
import { getSiteSettingsPublic, getCategoryList } from "@/lib/publicData";
import { getPaymentMode } from "@/lib/featureFlags";
import { pageMetadata, localBusinessJsonLd, faqJsonLd } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { JsonLd } from "@/components/seo/JsonLd";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LiveRefresher } from "@/components/landing/LiveRefresher";
import { DispatchSimulation } from "@/components/landing/DispatchSimulation";
import { CountryWaitlistSection } from "@/components/landing/CountryWaitlistSection";
import { ProofTicker } from "@/components/landing/ProofTicker";
import { PriceTransparencyWidget } from "@/components/landing/PriceTransparencyWidget";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { Results } from "@/components/landing/Results";
import { FeaturedPros } from "@/components/landing/FeaturedPros";
import { ForPros } from "@/components/landing/ForPros";
import { WhySection } from "@/components/landing/WhySection";
import { PlansTeaser } from "@/components/landing/PlansTeaser";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { WhatsappFab } from "@/components/landing/WhatsappFab";
import { SectionHead } from "@/components/ui/SectionHead";
import { AutoVideo } from "@/components/media/AutoVideo";
import { Reveal } from "@/components/ui/Reveal";
import { getDemoVideos } from "@/lib/siteVideos";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, h] = await Promise.all([getTranslations("meta.home"), getLocale(), headers()]);
  // On /sa the canonical URL is /sa (and /ar/sa in Arabic), not "/".
  const landing = (h.get("x-servigic-country") ?? "").toLowerCase();
  return pageMetadata({
    path: /^[a-z]{2}$/.test(landing) ? `/${landing}` : "/",
    locale: locale as Locale,
    title: { absolute: t("title") },
    description: t("description"),
    keywords: t("keywords").split(",").map((k) => k.trim()),
  });
}

async function getWhatsappNumber() {
  try {
    const settings = await getSiteSettingsPublic();
    return whatsappDigits(settings?.whatsappSupportNumber);
  } catch {
    return null;
  }
}

const PLAN_TEASER_TRADES = [
  { trade: "AC_TECHNICIAN" as const, fallbackPKR: 1500 },
  { trade: "GENERATOR_REPAIR" as const, fallbackPKR: 2000 },
  { trade: "WATER_TANK_CLEANING" as const, fallbackPKR: 2500 },
];

export default async function LandingPage() {
  const [whatsappNumber, categories, market, paymentMode, tDesc, tFaq, tSim, videos, tCust, tPro] = await Promise.all([
    getWhatsappNumber(),
    getCategoryList(),
    detectMarket(),
    getPaymentMode(),
    getTranslations("meta.home"),
    getTranslations("faq"),
    getTranslations("sim"),
    getDemoVideos(),
    getTranslations("servicesPage"),
    getTranslations("pro"),
  ]);
  const planCategories = categories.filter((c) => PLAN_TEASER_TRADES.some((t) => t.trade === c.trade));
  const liveCities = await getLiveCities(market.country);
  // The price widget lists only the visitor's own country's cities.
  const ownCities = await getCountryCities(market.country);

  const planTeaserCards = PLAN_TEASER_TRADES.map((t) => {
    const category = planCategories.find((c) => c.trade === t.trade);
    if (!category) return null;
    return { trade: t.trade as string, icon: category.icon, title: category.name, fromPKR: category.minPricePKR ?? t.fallbackPKR };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <>
      <JsonLd data={[localBusinessJsonLd(tDesc("description"), liveCities), faqJsonLd(tFaq.raw("items") as { q: string; a: string }[])]} />
      <Navbar />
      <LiveRefresher intervalMs={60000} />
      <main id="main" className="flex-1">
        <Hero isLive={market.isLive} />
        {!market.isLive && <CountryWaitlistSection countryCode={market.country} countryName={market.countryName} />}
        <ProofTicker />
        <section className="container-x py-8 md:py-12">
          <SectionHead eyebrow={tSim("eyebrow")} title={tSim("title")} align="center" />
          <DispatchSimulation />
        </section>
        <PriceTransparencyWidget categories={categories} cities={ownCities} />
        <Problem />
        <HowItWorks />
        <Features paymentMode={paymentMode} />
        <ServicesGrid />
        {/* The same demo videos as the Services and For Pros pages (set in Admin > Settings); a section only appears when its video is set. */}
        {videos.customer && (
          <section className="container-x max-w-[960px] pb-10" aria-label={tCust("videoTitle")}>
            <Reveal>
              <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{tCust("videoTitle")}</h2>
              <AutoVideo videoId={videos.customer} title={tCust("videoTitle")} />
            </Reveal>
          </section>
        )}
        <Results />
        <FeaturedPros />
        <ForPros />
        {videos.pro && (
          <section className="container-x max-w-[960px] pb-10" aria-label={tPro("videoTitle")}>
            <Reveal>
              <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{tPro("videoTitle")}</h2>
              <AutoVideo videoId={videos.pro} title={tPro("videoTitle")} />
            </Reveal>
          </section>
        )}
        <WhySection />
        <PlansTeaser cards={planTeaserCards} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <WhatsappFab number={whatsappNumber} />
    </>
  );
}
