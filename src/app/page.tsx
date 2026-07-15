import { prisma } from "@/lib/prisma";
import { LIVE_CITIES } from "@/lib/markets";
import { detectMarket } from "@/lib/geoDetect";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LiveRefresher } from "@/components/landing/LiveRefresher";
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

export const dynamic = "force-dynamic";

async function getWhatsappNumber() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    return settings?.whatsappSupportNumber ?? null;
  } catch {
    return null;
  }
}

const PLAN_TEASER_TRADES = [
  { trade: "AC_TECHNICIAN" as const, cadence: "Quarterly", fallbackPKR: 1500 },
  { trade: "GENERATOR_REPAIR" as const, cadence: "Every 6 months", fallbackPKR: 2000 },
  { trade: "WATER_TANK_CLEANING" as const, cadence: "Every 6 months", fallbackPKR: 2500 },
];

export default async function LandingPage() {
  const [whatsappNumber, categories, planCategories, market] = await Promise.all([
    getWhatsappNumber(),
    prisma.serviceCategory.findMany({ select: { id: true, name: true, icon: true }, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({
      where: { trade: { in: PLAN_TEASER_TRADES.map((t) => t.trade) } },
      select: { trade: true, name: true, icon: true, minPricePKR: true },
    }),
    detectMarket(),
  ]);

  const planTeaserCards = PLAN_TEASER_TRADES.map((t) => {
    const category = planCategories.find((c) => c.trade === t.trade);
    if (!category) return null;
    return { icon: category.icon, title: category.name, cadence: t.cadence, fromPKR: category.minPricePKR ?? t.fallbackPKR };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <>
      <Navbar />
      <LiveRefresher />
      <main className="flex-1">
        <Hero isLive={market.isLive} />
        {!market.isLive && <CountryWaitlistSection countryCode={market.country} countryName={market.countryName} />}
        <ProofTicker />
        <PriceTransparencyWidget categories={categories} cities={LIVE_CITIES} />
        <Problem />
        <HowItWorks />
        <Features />
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
