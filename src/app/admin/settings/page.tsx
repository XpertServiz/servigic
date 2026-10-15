import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const [settings, featureFlags] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    getFeatureFlags(),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Settings</h1>
      <p className="mb-8 text-text-muted">Theme, support number, default commission, and AI agents.</p>
      <SettingsForm
        initial={{
          activeTheme: settings?.activeTheme ?? "electric-amber",
          defaultCommissionPct: settings?.defaultCommissionPct ?? 12,
          whatsappSupportNumber: settings?.whatsappSupportNumber ?? "",
          demoVideoCustomerUrl: settings?.demoVideoCustomerUrl ?? "",
          demoVideoProUrl: settings?.demoVideoProUrl ?? "",
          defaultWalletCeilingPKR: settings?.defaultWalletCeilingPKR ?? 3000,
          earlyProFreeJobs: settings?.earlyProFreeJobs ?? 0,
          alertNearestN: settings?.alertNearestN ?? 12,
          noBidsAfterMin: settings?.noBidsAfterMin ?? 20,
          referralsEnabled: settings?.referralsEnabled ?? false,
          referralCustomerCreditPKR: settings?.referralCustomerCreditPKR ?? 200,
          referralProBonusPKR: settings?.referralProBonusPKR ?? 300,
          referralProJobsRequired: settings?.referralProJobsRequired ?? 3,
          referralNewProFreeJobs: settings?.referralNewProFreeJobs ?? 3,
          referralNewCustomerDiscountPKR: settings?.referralNewCustomerDiscountPKR ?? 200,
          referralNewCustomerMinJobPKR: settings?.referralNewCustomerMinJobPKR ?? 1000,
          proRadiusMinKm: settings?.proRadiusMinKm ?? 2,
          proRadiusMaxKm: settings?.proRadiusMaxKm ?? 15,
          proRadiusDefaultKm: settings?.proRadiusDefaultKm ?? 5,
          maxTradesPerPro: settings?.maxTradesPerPro ?? 3,
          featureFlags,
        }}
      />
    </div>
  );
}
