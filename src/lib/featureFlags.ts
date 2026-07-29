import { prisma } from "@/lib/prisma";

// P8 exit criteria: "Agents live behind feature flags". Defaults to ON —
// the real gate is AI_SERVICE_URL being set (see src/lib/aiService.ts), these
// flags let an admin turn an individual agent off without touching env vars.
export type PaymentMode = "CASH_WALLET" | "PROTECTED";

// v6 addendum — CASH_WALLET (customer pays the pro directly, commission
// settled via the pro's wallet) is the model for the current Pakistan
// launch. PROTECTED (the original escrow/Payment/Payout flow) is kept fully
// implemented and admin-toggleable for future international markets — never
// delete that code path, only branch around it.
export const DEFAULT_FEATURE_FLAGS = {
  aiJobTriage: true,
  aiLeadQualifier: true,
  aiDisputeSummarizer: true,
  aiBidWinHint: true,
  paymentMode: "CASH_WALLET" as PaymentMode,
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

export async function getPaymentMode(): Promise<PaymentMode> {
  const flags = await getFeatureFlags();
  return flags.paymentMode;
}
