import { prisma } from "@/lib/prisma";

// P8 exit criteria: "Agents live behind feature flags". Defaults to ON —
// the real gate is AI_SERVICE_URL being set (see src/lib/aiService.ts), these
// flags let an admin turn an individual agent off without touching env vars.
export const DEFAULT_FEATURE_FLAGS = {
  aiJobTriage: true,
  aiLeadQualifier: true,
  aiDisputeSummarizer: true,
  aiBidWinHint: true,
};

export type FeatureFlags = typeof DEFAULT_FEATURE_FLAGS;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const stored = (settings?.featureFlags as Partial<FeatureFlags>) ?? {};
    return { ...DEFAULT_FEATURE_FLAGS, ...stored };
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}
