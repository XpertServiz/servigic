import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { LIVE_CITIES } from "@/lib/markets";
import { detectMarket } from "@/lib/geoDetect";
import { getPaymentMode } from "@/lib/featureFlags";
import { getVisitorStats } from "@/lib/visitors";
import { getMoney } from "@/lib/money";
import { pageMetadata, localBusinessJsonLd, faqJsonLd } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { JsonLd } from "@/components/seo/JsonLd";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LiveRefresher } from "@/components/landing/LiveRefresher";
import { LiveVisitors } from "@/components/landing/LiveVisitors";
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

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.home"), getLocale()]);
  return pageMetadata({
    path: "/",
    locale: locale as Locale,
    title: { absolute: t("title") },
    description: t("description"),
    keywords: t("keywords").split(",").map((k) => k.trim()),
  });
}

async function getWhatsappNumber() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    return settings?.whatsappSupportNumber ?? null;
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
  const [whatsappNumber, categories, planCategories, market, paymentMode, visitors, tDesc, tFaq, tSim, money] = await Promise.all([
    getWhatsappNumber(),
    prisma.serviceCategory.findMany({ select: { id: true, name: true, trade: true, icon: true }, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({
      where: { trade: { in: PLAN_TEASER_TRADES.map((t) => t.trade) } },
      select: { trade: true, name: true, icon: true, minPricePKR: true },
    }),
    detectMarket(),
    getPaymentMode(),
    getVisitorStats(),
    getTranslations("meta.home"),
    getTranslations("faq"),
    getTranslations("sim"),
    getMoney(),
  ]);

  const planTeaserCards = PLAN_TEASER_TRADES.map((t) => {
    const category = planCategories.find((c) => c.trade === t.trade);
    if (!category) return null;
    return { trade: t.trade as string, icon: category.icon, title: category.name, fromPKR: category.minPricePKR ?? t.fallbackPKR };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <>
      <JsonLd data={[localBusinessJsonLd(tDesc("description")), faqJsonLd(tFaq.raw("items") as { q: string; a: string }[])]} />
      <Navbar />
      <LiveRefresher intervalMs={60000} />
      <main id="main" className="flex-1">
        <Hero isLive={market.isLive} />
        {!market.isLive && <CountryWaitlistSection countryCode={market.country} countryName={market.countryName} />}
        <ProofTicker />
        <LiveVisitors initial={visitors} />
        <section className="container-x py-8 md:py-12">
          <SectionHead eyebrow={tSim("eyebrow")} title={tSim("title")} align="center" />
          <DispatchSimulation />
        </section>
        <PriceTransparencyWidget categories={categories} cities={LIVE_CITIES} currency={money.currency} rate={money.rate} />
        <Problem />
        <HowItWorks />
        <Features paymentMode={paymentMode} />
        <ServicesGrid />
        <Results />
        <FeaturedPros />
        <ForPros />
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
