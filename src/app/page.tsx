import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProofTicker } from "@/components/landing/ProofTicker";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { Results } from "@/components/landing/Results";
import { ForPros } from "@/components/landing/ForPros";
import { WhySection } from "@/components/landing/WhySection";
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

export default async function LandingPage() {
  const whatsappNumber = await getWhatsappNumber();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProofTicker />
        <Problem />
        <HowItWorks />
        <Features />
        <ServicesGrid />
        <Results />
        <ForPros />
        <WhySection />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <WhatsappFab number={whatsappNumber} />
    </>
  );
}
