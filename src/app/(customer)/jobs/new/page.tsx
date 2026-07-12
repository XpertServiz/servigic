import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { detectMarket } from "@/lib/geoDetect";
import { LegalDisclaimer } from "@/components/ui/LegalDisclaimer";
import { PostJobForm } from "./PostJobForm";

export default async function PostJobPage() {
  const [categories, flags, market] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
      include: { subServices: { where: { active: true } } },
    }),
    getFeatureFlags(),
    detectMarket(),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Post a Job</h1>
      <p className="mb-8 text-text-muted">30 seconds. Your exact address stays hidden until you pay.</p>
      <PostJobForm categories={categories} aiTriageEnabled={flags.aiJobTriage} />
      {market.legalDisclaimer && <LegalDisclaimer text={market.legalDisclaimer} className="mt-6" />}
    </div>
  );
}
